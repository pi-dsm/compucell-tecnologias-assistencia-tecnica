const ServiceOrder = require('../models/ServiceOrder');
const Sale = require('../models/Sale');
const Setting = require('../models/Setting');
const { asyncHandler, httpError } = require('../utils/helpers');
const { round2 } = require('../utils/money');

const PERIODS = ['daily', 'weekly', 'monthly'];
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function buildBuckets(period) {
  const today = startOfDay(new Date());
  const out = [];
  if (period === 'monthly') {
    for (let i = 5; i >= 0; i--) {
      const s = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const e = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      out.push({ label: s.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), start: s, end: e });
    }
  } else if (period === 'weekly') {
    for (let i = 7; i >= 0; i--) {
      const e = addDays(today, 1 - i * 7);
      const s = addDays(e, -7);
      out.push({ label: s.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), start: s, end: e });
    }
  } else {
    for (let i = 6; i >= 0; i--) {
      const s = addDays(today, -i);
      out.push({ label: s.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }), start: s, end: addDays(s, 1) });
    }
  }
  return out;
}

async function getGoals() {
  const doc = await Setting.findOne({ key: 'goals' }).lean();
  return { daily: 0, weekly: 0, monthly: 0, ...(doc?.value || {}) };
}

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const topN = (map, n = 5) =>
  [...map.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, n).map(([, v]) => v);
const bump = (map, key, name) => {
  const cur = map.get(key) || { name, count: 0 };
  cur.count += 1;
  map.set(key, cur);
};

exports.summary = asyncHandler(async (req, res) => {
  const period = PERIODS.includes(req.query.period) ? req.query.period : 'daily';
  const buckets = buildBuckets(period);
  const from = buckets[0].start;
  const to = buckets[buckets.length - 1].end;

  const [osPayments, salePayments, delivered, sales, opened, statusCounts, goals] = await Promise.all([
    ServiceOrder.find({ 'payments.paid_at': { $gte: from } }).select('payments').lean(),
    Sale.find({ 'payments.paid_at': { $gte: from } }).select('payments').lean(),
    ServiceOrder.find({ delivered_at: { $gte: from } }).select('delivered_at profit_amount is_warranty discount_amount').lean(),
    Sale.find({ created_at: { $gte: from } }).select('created_at profit_amount discount_amount').lean(),
    ServiceOrder.find({ created_at: { $gte: from } }).select('created_at is_warranty device').populate('device', 'brand model').lean(),
    ServiceOrder.aggregate([{ $group: { _id: '$status', total: { $sum: 1 } } }]),
    getGoals(),
  ]);

  const rows = buckets.map((b) => ({
    label: b.label, revenue: 0, profit: 0, loss: 0, net_profit: 0, discounts: 0, delivered_orders: 0, sales_count: 0,
  }));
  const at = (d) => buckets.findIndex((b) => new Date(d) >= b.start && new Date(d) < b.end);

  // Faturamento = pagamentos recebidos - estornos, na data do pagamento
  [...osPayments, ...salePayments].forEach((doc) =>
    doc.payments.forEach((p) => {
      const i = at(p.paid_at);
      if (i < 0) return;
      if (p.payment_status === 'paid') rows[i].revenue += p.amount;
      else if (p.payment_status === 'refunded') rows[i].revenue -= p.amount;
    })
  );
  // Lucro de OS na data de entrega; OS de garantia entra como prejuízo (-lucro)
  delivered.forEach((o) => {
    const i = at(o.delivered_at);
    if (i < 0) return;
    rows[i].delivered_orders += 1;
    rows[i].discounts += o.discount_amount || 0;
    if (o.is_warranty) rows[i].loss += Math.max(0, -o.profit_amount);
    else rows[i].profit += o.profit_amount;
  });
  sales.forEach((s) => {
    const i = at(s.created_at);
    if (i < 0) return;
    rows[i].sales_count += 1;
    rows[i].profit += s.profit_amount;
    rows[i].discounts += s.discount_amount || 0;
  });
  rows.forEach((r) => {
    r.net_profit = r.profit - r.loss;
    ['revenue', 'profit', 'loss', 'net_profit', 'discounts'].forEach((k) => (r[k] = round2(r[k])));
  });

  // Trackeadores (marcas, modelos e dias de pico) na janela inteira
  const brands = new Map();
  const models = new Map();
  const weekdays = Array.from({ length: 7 }, (_, weekday) => ({ weekday, orders: 0, sales: 0 }));
  let warrantyReturns = 0;
  opened.forEach((o) => {
    weekdays[new Date(o.created_at).getDay()].orders += 1;
    if (o.is_warranty) warrantyReturns += 1;
    if (o.device) {
      const brand = o.device.brand.trim();
      const model = o.device.model.trim();
      bump(brands, brand.toLowerCase(), titleCase(brand));
      bump(models, `${brand} ${model}`.toLowerCase(), `${titleCase(brand)} ${model}`);
    }
  });
  sales.forEach((s) => (weekdays[new Date(s.created_at).getDay()].sales += 1));

  const current = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const target = goals[period] || 0;
  const counts = { received: 0, in_diagnosis: 0, in_repair: 0, ready: 0 };
  statusCounts.forEach((s) => {
    if (s._id in counts) counts[s._id] = s.total;
  });

  res.json({
    period,
    window: { from, to },
    counts,
    series: rows,
    current,
    previous,
    delta_revenue_pct: previous.revenue > 0 ? round2(((current.revenue - previous.revenue) / previous.revenue) * 100) : null,
    goal: { target, progress: target > 0 ? round2((current.revenue / target) * 100) : null },
    trackers: { brands: topN(brands), models: topN(models), weekdays },
    warranty_returns: warrantyReturns,
  });
});

exports.getGoals = asyncHandler(async (req, res) => res.json(await getGoals()));

exports.updateGoals = asyncHandler(async (req, res) => {
  const goals = {};
  for (const key of PERIODS) {
    const value = Number(req.body[key] ?? 0);
    if (!(value >= 0)) throw httpError(400, 'Meta inválida: informe um valor maior ou igual a zero');
    goals[key] = round2(value);
  }
  await Setting.findOneAndUpdate({ key: 'goals' }, { value: goals }, { upsert: true, new: true });
  res.json(goals);
});