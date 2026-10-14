const Customer = require('../models/Customer');
const Device = require('../models/Device');
const ServiceOrder = require('../models/ServiceOrder');
const company = require('../config/company');
const { CLOSED_STATUSES } = ServiceOrder;
const { pick, httpError } = require('../utils/helpers');
const { round2, formatBRL } = require('../utils/money');
const { netPaid, normalizePayments } = require('../utils/payments');

const CUSTOMER_FIELDS = ['name', 'phone', 'alternative_phone'];
const DEVICE_FIELDS = ['device_type', 'brand', 'model', 'passcode' ];
const PART_FIELDS = [
  'part_name', 'is_own_stock', 'supplier_name', 'supplier_contact', 'purchase_reference',
  'cost_price', 'sale_price', 'quantity', 'warranty_days',
];
// Mudanças "rápidas" (sem dados obrigatórios). 'ready' e 'delivered' têm fluxo próprio.
const QUICK_STATUSES = ['received', 'in_diagnosis', 'in_repair', 'cancelled'];

const addDays = (date, days) => new Date(date.getTime() + days * 86400000);
const ensureOpen = (order) => {
  if (CLOSED_STATUSES.includes(order.status)) throw httpError(409, 'Esta OS já foi finalizada e não pode mais ser alterada.');
};

async function buildCustomer(body, userId) {
  if (body.customer_id) {
    const customer = await Customer.findById(body.customer_id);
    if (!customer) throw httpError(404, 'Cliente não encontrado');
    return customer;
  }
  if (!body.customer) throw httpError(400, 'Informe o cliente');
  return new Customer({ ...pick(body.customer, CUSTOMER_FIELDS), created_by: userId });
}

async function buildDevice(body, customer) {
  if (body.device_id) {
    const device = await Device.findOne({ _id: body.device_id, customer: customer._id });
    if (!device) throw httpError(404, 'Aparelho não encontrado para este cliente');
    if (body.device?.passcode) device.passcode = body.device.passcode; // a senha pode mudar entre atendimentos
    return device;
  }
  if (!body.device) throw httpError(400, 'Informe o aparelho');
  return new Device({ ...pick(body.device, DEVICE_FIELDS), customer: customer._id });
}

// 1) Abertura: valida tudo ANTES de gravar para não deixar cliente/aparelho órfãos.
exports.openOrder = async (body, user) => {
  const customer = await buildCustomer(body, user._id);
  const device = await buildDevice(body, customer);
  const order = new ServiceOrder({
    ...pick(body, ['reported_issue', 'estimated_budget_at', 'estimated_delivery_at', 'internal_notes']),
    customer: customer._id,
    device: device._id,
    status: 'received',
    status_history: [{ status: 'received', changed_by: user._id }],
    created_by: user._id,
    updated_by: user._id,
  });

  await Promise.all([customer.validate(), device.validate(), order.validate()]);
  if (customer.isNew) await customer.save();
  if (device.isNew || device.isModified()) await device.save();
  await order.save();
  return order;
};

// 2) Mudança rápida de status
exports.changeStatus = async (order, status, user) => {
  ensureOpen(order);
  if (status === 'ready') throw httpError(400, 'Para marcar como pronta, informe as peças utilizadas e a mão de obra.');
  if (status === 'delivered') throw httpError(400, 'Para entregar, registre o pagamento no fechamento da OS.');
  if (!QUICK_STATUSES.includes(status)) throw httpError(400, 'Status inválido');
  if (order.status === status) return order;

  if (order.status === 'ready') order.ready_at = undefined; // voltou para a bancada
  order.setStatus(status, user._id);
  await order.save();
  return order;
};

// 3) in_repair -> ready: peças e mão de obra obrigatórias (ou "nenhuma peça")
exports.markReady = async (order, body, user) => {
  if (!['in_repair', 'ready'].includes(order.status)) {
    throw httpError(409, 'Só é possível marcar como pronta uma OS que está em conserto.');
  }
  const noParts = !!body.no_parts_used;
  const parts = Array.isArray(body.parts_used) ? body.parts_used.map((p) => pick(p, PART_FIELDS)) : [];
  if (!noParts && parts.length === 0) {
    throw httpError(400, 'Informe as peças utilizadas ou marque "Nenhuma peça foi utilizada".');
  }

  order.no_parts_used = noParts;
  order.parts_used = noParts ? [] : parts;
  order.labor_amount = round2(body.labor_amount || 0);
  if (order.status !== 'ready') {
    order.ready_at = new Date();
    order.setStatus('ready', user._id);
  } else {
    order.updated_by = user._id; // correção de dados com a OS já pronta
  }
  await order.save();
  return order;
};

// 4) ready -> delivered: pagamento, desconto e saldo pendente explícito
exports.deliver = async (order, body, user) => {
  if (order.status !== 'ready') throw httpError(409, 'Só é possível entregar uma OS que está pronta.');

  const gross = round2(order.parts_total_amount + order.labor_amount);
  const discount = round2(body.discount_amount || 0);
  if (discount < 0 || discount > gross) throw httpError(400, 'Desconto inválido: não pode ser maior que o valor da OS.');
  order.discount_amount = discount;
  order.recalculate();

  normalizePayments(body.payments).forEach((p) => order.payments.push(p));

  const balance = round2(Math.max(0, order.grand_total_amount - netPaid(order.payments)));
  if (balance > 0 && !body.allow_partial) {
    throw httpError(400, `Falta receber ${formatBRL(balance)}. Registre o pagamento ou confirme a entrega com saldo pendente.`);
  }

  const now = new Date();
  const days = Number.isFinite(Number(body.warranty_days)) && body.warranty_days !== '' && body.warranty_days !== null
    ? Math.max(0, Math.floor(Number(body.warranty_days)))
    : company.defaultWarrantyDays;
  order.delivered_at = now;
  order.warranty_days = days;
  order.warranty_until = days > 0 ? addDays(now, days) : undefined;
  order.setStatus('delivered', user._id);
  await order.save();
  return order;
};

// 5) Pagamento posterior (ex.: quitar saldo pendente depois da entrega)
exports.addPayment = async (order, body, user) => {
  if (!['ready', 'delivered'].includes(order.status)) {
    throw httpError(409, 'Pagamentos só podem ser registrados em OS prontas ou entregues.');
  }
  const [payment] = normalizePayments([body]);
  if (!payment) throw httpError(400, 'Informe o pagamento');
  if (payment.amount > order.balance_due + 0.001) {
    throw httpError(400, `Valor excede o saldo restante (${formatBRL(order.balance_due)}).`);
  }
  order.payments.push(payment);
  order.updated_by = user._id;
  await order.save();
  return order;
};

// 6) Retorno em garantia: original -> returned, nova OS vinculada (is_warranty)
exports.registerReturn = async (original, body, user) => {
  if (original.status !== 'delivered') throw httpError(409, 'Apenas OS entregues podem retornar em garantia.');
  if (!original.is_under_warranty) {
    throw httpError(409, 'A garantia desta OS já expirou. Abra uma nova OS para este atendimento.');
  }

  const warrantyOrder = new ServiceOrder({
    ...pick(body, ['reported_issue', 'estimated_budget_at', 'estimated_delivery_at']),
    customer: original.customer,
    device: original.device,
    origin_order: original._id,
    is_warranty: true,
    internal_notes: `Retorno em garantia da OS #${original.service_order_number}.${body.internal_notes ? ` ${body.internal_notes}` : ''}`,
    status: 'received',
    status_history: [{ status: 'received', changed_by: user._id }],
    created_by: user._id,
    updated_by: user._id,
  });
  await warrantyOrder.save(); // valida antes de alterar a original

  original.setStatus('returned', user._id);
  await original.save();
  return warrantyOrder;
};

// 7) Cancelamento
exports.cancel = async (order, user) => {
  ensureOpen(order);
  order.setStatus('cancelled', user._id);
  await order.save();
  return order;
};