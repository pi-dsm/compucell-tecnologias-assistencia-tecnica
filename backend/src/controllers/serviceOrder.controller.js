const ServiceOrder = require('../models/ServiceOrder');
const { STATUSES, METHODS } = require('../models/ServiceOrder');
const { asyncHandler, clean, pick, escapeRegex } = require('../utils/helpers');
const { round2, formatBRL } = require('../utils/money');

const findOrder = async (id, res) => {
  const order = await ServiceOrder.findById(id);
  if (!order) res.status(404).json({ message: 'Ordem de serviço não encontrada' });
  return order;
};

exports.create = asyncHandler(async (req, res) => {
  const b = clean(req.body);
  const order = new ServiceOrder({
    ...pick(b, ['customer', 'device', 'reported_issue', 'physical_condition', 'passcode', 'acessories_left_behind', 'estimated_delivery_at', 'labor_total_amount', 'discount_amount', 'internal_notes']),
    service_order_number: await ServiceOrder.nextNumber(),
    created_by: req.user._id,
    updated_by: req.user._id,
  });
  await order.save();
  res.status(201).json(order);
});

exports.list = asyncHandler(async (req, res) => {
  const { status, q } = req.query;
  const filter = {};
  if (status && STATUSES.includes(status)) filter.status = status;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    const or = [{ 'customer.customer_name': rx }, { 'customer.customer_phone': rx }, { 'device.device_model': rx }, { 'device.device_brand': rx }];
    if (/^\d+$/.test(q)) or.push({ service_order_number: Number(q) });
    filter.$or = or;
  }
  res.json(await ServiceOrder.find(filter).sort({ updated_at: -1 }).limit(200));
});

exports.searchCustomers = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  const rx = new RegExp(escapeRegex(q), 'i');
  const orders = await ServiceOrder.find({ $or: [{ 'customer.customer_name': rx }, { 'customer.customer_phone': rx }] })
    .sort({ created_at: -1 })
    .limit(60)
    .select('customer');
  const seen = new Set();
  const result = [];
  for (const o of orders) {
    const key = (o.customer.customer_phone || '').replace(/\D/g, '') || String(o.customer.customer_id);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(o.customer);
    if (result.length >= 8) break;
  }
  res.json(result);
});

exports.get = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id, res);
  if (order) res.json(order);
});

exports.update = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id, res);
  if (!order) return;
  const b = req.body;
  for (const k of Object.keys(b.customer || {})) order.set(`customer.${k}`, b.customer[k]);
  for (const k of Object.keys(b.device || {})) order.set(`device.${k}`, b.device[k]);
  const simple = pick(b, ['reported_issue', 'physical_condition', 'passcode', 'acessories_left_behind', 'internal_notes', 'labor_total_amount', 'discount_amount', 'estimated_delivery_at']);
  if (simple.estimated_delivery_at === '') simple.estimated_delivery_at = null;
  order.set(simple);
  order.updated_by = req.user._id;
  await order.save();
  res.json(order);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Status inválido' });
  const order = await findOrder(req.params.id, res);
  if (!order) return;
  if (status === 'delivered' && order.balance_due > 0) {
    return res.status(400).json({ message: `Existe saldo pendente de ${formatBRL(order.balance_due)}. Registre o pagamento antes de entregar.` });
  }
  order.status = status;
  if (status === 'ready' && !order.finished_at) order.finished_at = new Date();
  if (status === 'delivered') {
    order.delivered_at = new Date();
    if (!order.finished_at) order.finished_at = new Date();
  }
  if (['received', 'in_diagnosis', 'in_repair'].includes(status)) {
    order.finished_at = undefined;
    order.delivered_at = undefined;
  }
  order.updated_by = req.user._id;
  await order.save();
  res.json(order);
});

exports.updateParts = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id, res);
  if (!order) return;
  const { part, parts_used } = req.body;
  if (Array.isArray(parts_used)) order.parts_used = parts_used;
  if (part) {
    const idx = part.part_id ? order.parts_used.findIndex((p) => String(p.part_id) === String(part.part_id)) : -1;
    if (idx >= 0) order.parts_used[idx].set(part);
    else order.parts_used.push(part);
  }
  order.updated_by = req.user._id;
  await order.save(); // recalcula parts_total, grand_total e lucro
  res.json(order);
});

exports.addPayment = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id, res);
  if (!order) return;
  const amount = round2(req.body.amount);
  const { payment_method, payment_status = 'paid' } = req.body;
  if (!(amount > 0)) return res.status(400).json({ message: 'Informe um valor maior que zero' });
  if (!METHODS.includes(payment_method)) return res.status(400).json({ message: 'Forma de pagamento inválida' });
  if (payment_status === 'paid' && amount > order.balance_due + 0.001) {
    return res.status(400).json({ message: `Valor excede o saldo restante (${formatBRL(order.balance_due)})` });
  }
  order.payments.push({ amount, payment_method, payment_status, paid_at: new Date() });
  order.updated_by = req.user._id;
  await order.save();
  res.json(order);
});

exports.remove = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id, res);
  if (!order) return;
  if (req.query.hard === 'true') {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Apenas administradores podem remover' });
    await order.deleteOne();
    return res.json({ message: 'OS removida' });
  }
  order.status = 'cancelled';
  order.updated_by = req.user._id;
  await order.save();
  res.json(order);
});