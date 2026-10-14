const ServiceOrder = require('../models/ServiceOrder');
const Customer = require('../models/Customer');
const Device = require('../models/Device');
const flow = require('../services/serviceOrder.service');
const pdf = require('../services/pdf.service');
const { STATUSES, OPEN_STATUSES, CLOSED_STATUSES } = ServiceOrder;
const { asyncHandler, clean, pick, escapeRegex, parseLimit, httpError } = require('../utils/helpers');

const FULL = [{ path: 'customer' }, { path: 'device' }, { path: 'origin_order', select: 'service_order_number status' }];
const LIGHT = [
  { path: 'customer', select: 'name phone' },
  { path: 'device', select: 'device_type brand model' },
];
const SORTS = {
  updated: { updated_at: -1 },
  oldest: { created_at: 1 },
  newest: { created_at: -1 },
  ready_oldest: { ready_at: 1 },
};

const loadOrder = async (id) => {
  const order = await ServiceOrder.findById(id);
  if (!order) throw httpError(404, 'Ordem de serviço não encontrada');
  return order;
};
const respond = async (res, order, status = 200) => res.status(status).json(await order.populate(FULL));

exports.create = asyncHandler(async (req, res) => {
  const order = await flow.openOrder(clean(req.body), req.user);
  await respond(res, order, 201);
});

exports.list = asyncHandler(async (req, res) => {
  const { status, scope, q, sort, limit, customer_id } = req.query;
  const filter = {};
  if (status && STATUSES.includes(status)) filter.status = status;
  else if (scope === 'open') filter.status = { $in: OPEN_STATUSES };
  else if (scope === 'closed') filter.status = { $in: CLOSED_STATUSES };
  if (customer_id) filter.customer = customer_id;

  const term = String(q || '').trim();
  if (term) {
    const rx = new RegExp(escapeRegex(term), 'i');
    const [customers, devices] = await Promise.all([
      Customer.find(Customer.searchFilter(term)).select('_id').limit(100).lean(),
      Device.find({ $or: [{ brand: rx }, { model: rx }, { serial_number: rx }] }).select('_id').limit(100).lean(),
    ]);
    const or = [{ customer: { $in: customers.map((c) => c._id) } }, { device: { $in: devices.map((d) => d._id) } }];
    if (/^#?\d+$/.test(term)) or.push({ service_order_number: Number(term.replace('#', '')) });
    filter.$or = or;
  }

   const orders = await ServiceOrder.find(filter)
    .sort(SORTS[sort] || SORTS.updated)
    .limit(parseLimit(limit, 300, 500))
    .populate(LIGHT);
  res.json(orders);
});

exports.get = asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  await order.populate(FULL);
  const warranty_returns = await ServiceOrder.find({ origin_order: order._id })
    .select('service_order_number status created_at')
    .sort({ created_at: -1 });
  res.json({ ...order.toJSON(), warranty_returns });
});

// Edição de dados básicos (cliente/aparelho têm endpoints próprios)
exports.update = asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  const b = req.body;
  const closed = CLOSED_STATUSES.includes(order.status);
  if (b.internal_notes !== undefined) order.internal_notes = b.internal_notes; // sempre editável
  if (!closed) {
    order.set(clean(pick(b, ['reported_issue', 'estimated_budget_at', 'estimated_delivery_at'])));
  }
  order.updated_by = req.user._id;
  await order.save();
  await respond(res, order);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  await flow.changeStatus(order, req.body.status, req.user);
  await respond(res, order);
});

exports.markReady = asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  await flow.markReady(order, req.body, req.user);
  await respond(res, order);
});

exports.deliver = asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  await flow.deliver(order, req.body, req.user);
  await respond(res, order);
});

exports.addPayment = asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  await flow.addPayment(order, req.body, req.user);
  await respond(res, order);
});

exports.registerReturn = asyncHandler(async (req, res) => {
  const original = await loadOrder(req.params.id);
  const warrantyOrder = await flow.registerReturn(original, clean(req.body), req.user);
  await respond(res, warrantyOrder, 201);
});

exports.remove = asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  if (req.query.hard === 'true') {
    if (req.user.role !== 'admin') throw httpError(403, 'Apenas administradores podem remover definitivamente');
    await order.deleteOne();
    return res.json({ message: 'OS removida' });
  }
  await flow.cancel(order, req.user);
  await respond(res, order);
});

const sendPdf = (res, buffer, filename) => {
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${filename}"` });
  res.send(buffer);
};

exports.receiptPdf = asyncHandler(async (req, res) => {
  const order = await (await loadOrder(req.params.id)).populate(FULL);
  sendPdf(res, await pdf.buildReceipt(order), `OS-${order.service_order_number}-comprovante.pdf`);
});

exports.warrantyPdf = asyncHandler(async (req, res) => {
  const order = await (await loadOrder(req.params.id)).populate(FULL);
  if (order.status !== 'delivered') throw httpError(409, 'O termo de garantia só é emitido para OS entregues.');
  sendPdf(res, await pdf.buildWarranty(order), `OS-${order.service_order_number}-garantia.pdf`);
});