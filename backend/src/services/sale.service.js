const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Service = require('../models/Service');
const Customer = require('../models/Customer');
const { takeStock, returnStock, logMovements } = require('./stock.service');
const { httpError } = require('../utils/helpers');
const { round2, formatBRL } = require('../utils/money');
const { netPaid, normalizePayments } = require('../utils/payments');

// Converte o carrinho em itens da venda. Preço e custo dos produtos vêm SEMPRE do cadastro.
async function resolveItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw httpError(400, 'Adicione ao menos 1 item ao carrinho');
  const merged = new Map();

  for (const raw of rawItems) {
    const quantity = parseInt(raw.quantity, 10) || 1;
    if (quantity < 1) throw httpError(400, 'Quantidade inválida');

    if (raw.item_type === 'product') {
      const product = await Product.findOne({ _id: raw.product_id, is_active: true });
      if (!product) throw httpError(404, 'Produto não encontrado ou inativo');
      const key = `p:${product._id}`;
      const prev = merged.get(key);
      if (prev) prev.quantity += quantity;
      else {
        merged.set(key, {
          item_type: 'product', product: product._id, name: product.name, barcode: product.barcode,
          quantity, unit_price: product.sale_price, unit_cost: product.cost_price,
        });
      }
    } else if (raw.item_type === 'service') {
      const service = await Service.findOne({ _id: raw.service_id, is_active: true });
      if (!service) throw httpError(404, 'Serviço não encontrado ou inativo');
      const hasPrice = raw.unit_price !== undefined && raw.unit_price !== '' && raw.unit_price !== null;
      const price = hasPrice ? round2(raw.unit_price) : service.price;
      if (!(price >= 0)) throw httpError(400, 'Preço do serviço inválido');
      const key = `s:${service._id}:${price}`;
      const prev = merged.get(key);
      if (prev) prev.quantity += quantity;
      else {
        merged.set(key, {
          item_type: 'service', service: service._id, name: service.name,
          quantity, unit_price: price, unit_cost: service.cost_price,
        });
      }
    } else {
      throw httpError(400, 'Tipo de item inválido');
    }
  }
  return [...merged.values()];
}

exports.createSale = async (body, user) => {
  const items = await resolveItems(body.items);

  let customerId;
  if (body.customer_id) {
    const customer = await Customer.findById(body.customer_id);
    if (!customer) throw httpError(404, 'Cliente não encontrado');
    customerId = customer._id;
  }

  const discount = round2(body.discount_amount || 0);
  const sale = new Sale({ items, discount_amount: discount, customer: customerId, notes: body.notes, created_by: user._id });
  sale.recalculate();
  if (discount < 0 || discount > sale.subtotal_amount) throw httpError(400, 'Desconto inválido: maior que o subtotal');

  normalizePayments(body.payments).forEach((p) => sale.payments.push(p));
  const balance = round2(Math.max(0, sale.grand_total_amount - netPaid(sale.payments)));
  if (balance > 0) {
    if (!body.allow_partial) {
      throw httpError(400, `Falta receber ${formatBRL(balance)}. Registre o pagamento ou confirme a venda com saldo pendente.`);
    }
    if (!customerId) throw httpError(400, 'Informe o cliente para registrar uma venda com saldo pendente.');
  }

  // Estoque: baixa atômica por produto; se algo falhar, devolve o que já foi baixado.
  const reserved = [];
  try {
    for (const item of sale.items.filter((i) => i.item_type === 'product')) {
      const updated = await takeStock(item.product, item.quantity);
      if (!updated) throw httpError(409, `Estoque insuficiente para "${item.name}".`);
      reserved.push({ item, balance_after: updated.stock_quantity });
    }
    await sale.save();
  } catch (err) {
    await Promise.all(reserved.map(({ item }) => returnStock(item.product, item.quantity)));
    throw err;
  }

  try {
    await logMovements(
      reserved.map(({ item, balance_after }) => ({
        product: item.product, kind: 'sale', quantity: -item.quantity, balance_after,
        reason: `Venda #${sale.sale_number}`, sale: sale._id, created_by: user._id,
      }))
    );
  } catch (err) {
    console.error('Falha ao registrar movimentação de estoque:', err.message); // a venda já foi concluída
  }
  return sale;
};

exports.addPayment = async (sale, body) => {
  const [payment] = normalizePayments([body]);
  if (!payment) throw httpError(400, 'Informe o pagamento');
  if (payment.amount > sale.balance_due + 0.001) throw httpError(400, `Valor excede o saldo restante (${formatBRL(sale.balance_due)}).`);
  sale.payments.push(payment);
  await sale.save();
  return sale;
};

exports.refund = async (sale, body, user) => {
  const refundable = netPaid(sale.payments);
  const hasAmount = body.amount !== undefined && body.amount !== '' && body.amount !== null;
  const amount = hasAmount ? round2(body.amount) : refundable;
  if (!(amount > 0)) throw httpError(400, 'Não há valor a estornar');
  if (amount > refundable + 0.001) throw httpError(400, `Máximo estornável: ${formatBRL(refundable)}`);

  sale.payments.push({
    amount,
    payment_method: body.payment_method || sale.payments.find((p) => p.payment_status === 'paid')?.payment_method || 'cash',
    payment_status: 'refunded',
    paid_at: new Date(),
  });
  sale.refunded_amount = round2(sale.refunded_amount + amount);

  // Devolução total + "restock": devolve os produtos ao estoque (uma única vez)
  const fullRefund = sale.refunded_amount + 0.001 >= sale.grand_total_amount;
  if (body.restock && fullRefund && !sale.restocked) {
    const rows = [];
    for (const item of sale.items.filter((i) => i.item_type === 'product')) {
      const updated = await returnStock(item.product, item.quantity);
      if (updated) {
        rows.push({
          product: item.product, kind: 'refund', quantity: item.quantity, balance_after: updated.stock_quantity,
          reason: `Estorno da venda #${sale.sale_number}`, sale: sale._id, created_by: user._id,
        });
      }
    }
    sale.restocked = true;
    await logMovements(rows);
  }
  await sale.save();
  return sale;
};