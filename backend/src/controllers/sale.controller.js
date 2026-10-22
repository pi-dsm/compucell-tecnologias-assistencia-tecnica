const Sale = require('../models/Sale');
const flow = require('../services/sale.service');
const { asyncHandler, parseLimit, httpError } = require('../utils/helpers');
const { allocateItems } = require('../utils/saleReports');
const { toKey } = require('../utils/businessDays');
const { round2 } = require('../utils/money');

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

const PERIOD_MS = { '24h': 24 * 3600 * 1000, '7d': 7 * 24 * 3600 * 1000 };

exports.create = asyncHandler(async (req, res) => {
  await respond(res, await flow.createSale(req.body, req.user), 201);
});

exports.list = asyncHandler(async (req, res) => {
  const { from, to, q, period } = req.query;
  const filter = {};
   if (PERIOD_MS[period]) {
    filter.created_at = { $gte: new Date(Date.now() - PERIOD_MS[period]) };
  } else if (from || to) {
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

exports.itemRows = asyncHandler(async (req, res) => {
  const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
  const from = req.query.from || toKey(new Date());
  const to = req.query.to || from;
  if (!isDay(from) || !isDay(to)) throw httpError(400, 'Datas inválidas: use o formato AAAA-MM-DD');

  const sales = await Sale.find({
    created_at: { $gte: new Date(`${from}T00:00:00`), $lte: new Date(`${to}T23:59:59.999`) },
  })
    .sort({ created_at: -1 })
    .select('sale_number created_at items subtotal_amount discount_amount')
    .lean();

  const rows = sales.flatMap((sale) =>
    allocateItems(sale).map((row) => ({ ...row, sale_id: String(sale._id), sale_number: sale.sale_number, created_at: sale.created_at }))
  );

  const total_price = round2(rows.reduce((s, r) => s + r.total_price, 0));
  const total_cost = round2(rows.reduce((s, r) => s + r.total_cost, 0));
  const profit = round2(total_price - total_cost);
  res.json({
    from,
    to,
    rows,
    totals: { items: rows.length, total_cost, total_price, profit, profit_pct: total_price > 0 ? round2((profit / total_price) * 100) : 0 },
  });
});