const Sale = require('../models/Sale');
const { METHODS } = require('../models/ServiceOrder');
const { asyncHandler, pick } = require('../utils/helpers');
const { round2, formatBRL } = require('../utils/money');

exports.create = asyncHandler(async (req, res) => {
  const { products_sold, payment_method } = req.body;
  const discount_amount = Number(req.body.discount_amount) || 0;
  if (!Array.isArray(products_sold) || !products_sold.length) return res.status(400).json({ message: 'Adicione ao menos 1 item' });
  if (!METHODS.includes(payment_method)) return res.status(400).json({ message: 'Forma de pagamento inválida' });

  const sale = new Sale({
    products_sold: products_sold.map((p) => pick(p, ['comercial_name', 'category', 'specifications', 'cost_price', 'selling_price', 'quantity'])),
    discount_amount,
    created_by: req.user._id,
  });
  sale.recalculate();
  if (discount_amount > sale.subtotal_amount) return res.status(400).json({ message: 'Desconto maior que o subtotal' });
  if (sale.grand_total_amount > 0) {
    sale.payments.push({ amount: sale.grand_total_amount, payment_method, payment_status: 'paid', paid_at: new Date() });
  }
  await sale.save();
  res.status(201).json(sale);
});

exports.list = asyncHandler(async (req, res) => {
  res.json(await Sale.find().sort({ created_at: -1 }).limit(300).populate('created_by', 'name'));
});

exports.get = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate('created_by', 'name');
  if (!sale) return res.status(404).json({ message: 'Venda não encontrada' });
  res.json(sale);
});

exports.refund = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ message: 'Venda não encontrada' });
  const remaining = round2(sale.grand_total_amount - sale.refunded_amount);
  const hasAmount = req.body.amount !== undefined && req.body.amount !== '' && req.body.amount !== null;
  const amount = hasAmount ? round2(req.body.amount) : remaining;
  if (!(amount > 0)) return res.status(400).json({ message: 'Não há valor a estornar' });
  if (amount > remaining) return res.status(400).json({ message: `Máximo estornável: ${formatBRL(remaining)}` });

  sale.payments.push({
    amount,
    payment_method: req.body.payment_method || sale.payments[0]?.payment_method || 'cash',
    payment_status: 'refunded',
    paid_at: new Date(),
  });
  sale.refunded_amount = round2(sale.refunded_amount + amount);
  await sale.save();
  res.json(sale);
});