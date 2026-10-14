const Sale = require('../models/Sale');
const flow = require('../services/sale.service');
const { asyncHandler, parseLimit, httpError } = require('../utils/helpers');

const POPULATE = [
  { path: 'customer', select: 'name phone' },
  { path: 'created_by', select: 'name' },
];

const loadSale = async (id) => {
  const sale = await Sale.findById(id);
  if (!sale) throw httpError(404, 'Venda não encontrada');
  return sale;
};
const respond = async (res, sale, status = 200) => res.status(status).json(await sale.populate(POPULATE));

exports.create = asyncHandler(async (req, res) => {
  await respond(res, await flow.createSale(req.body, req.user), 201);
});

exports.list = asyncHandler(async (req, res) => {
  const { from, to, q } = req.query;
  const filter = {};
  if (from || to) {
    filter.created_at = {};
    if (from) filter.created_at.$gte = new Date(`${from}T00:00:00`);
    if (to) filter.created_at.$lte = new Date(`${to}T23:59:59.999`);
  }
  if (q && /^#?\d+$/.test(String(q).trim())) filter.sale_number = Number(String(q).replace('#', ''));
  res.json(await Sale.find(filter).sort({ created_at: -1 }).limit(parseLimit(req.query.limit, 200, 500)).populate(POPULATE));
});

exports.get = asyncHandler(async (req, res) => {
  await respond(res, await loadSale(req.params.id));
});

exports.addPayment = asyncHandler(async (req, res) => {
  const sale = await loadSale(req.params.id);
  await respond(res, await flow.addPayment(sale, req.body));
});

exports.refund = asyncHandler(async (req, res) => {
  const sale = await loadSale(req.params.id);
  await respond(res, await flow.refund(sale, req.body, req.user));
});