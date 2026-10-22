const ServiceOrder = require('../models/ServiceOrder');
const Sale = require('../models/Sale');
const Setting = require('../models/Setting');
const { asyncHandler, httpError } = require('../utils/helpers');
const { round2 } = require('../utils/money');
const { allocateItems } = require('../utils/saleReports');

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

async function getGoals(scope) {
  const doc = await Setting.findOne({ key: scope === 'sales' ? 'sales_goals' : 'goals' }).lean();
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

exports.getGoals = asyncHandler(async (req, res) => res.json(await getGoals(req.query.scope)));

exports.updateGoals = asyncHandler(async (req, res) => {
  const goals = {};
  for (const key of PERIODS) {
    const value = Number(req.body[key] ?? 0);
    if (!(value >= 0)) throw httpError(400, 'Meta inválida: informe um valor maior ou igual a zero');
    goals[key] = round2(value);
  }

  const key = req.query.scope === 'sales' ? 'sales_goals' : 'goals';
  await Setting.findOneAndUpdate({ key }, { value: goals }, { upsert: true, new: true });
  res.json(goals);
});

// Valores "vendidos" (competência): já líquidos do desconto, na data da venda. Não é o caixa recebido.
exports.salesAnalytics = asyncHandler(async (req, res) => {
  const period = PERIODS.includes(req.query.period) ? req.query.period : 'daily';
  const buckets = buildBuckets(period);
  const from = buckets[0].start;

  const [sales, goals] = await Promise.all([
    Sale.find({ created_at: { $gte: from } }).select('created_at items subtotal_amount discount_amount payments').lean(),
    getGoals('sales'),
  ]);
  const target = goals[period] || 0;

  const rows = buckets.map((b) => ({
    label: b.label, goal: target, sales_count: 0, items_sold: 0,
    products_revenue: 0, services_revenue: 0, products_profit: 0, services_profit: 0,
    products_qty: 0, services_qty: 0, revenue: 0, profit: 0,
  }));
  const at = (d) => buckets.findIndex((b) => d >= b.start && d < b.end);
  const topProducts = new Map();
  const topServices = new Map();
  const methods = new Map();

  sales.forEach((sale) => {
    const i = at(new Date(sale.created_at));
    if (i < 0) return;
    rows[i].sales_count += 1;
    allocateItems(sale).forEach((it) => {
      const kind = it.item_type === 'product' ? 'products' : 'services';
      rows[i][`${kind}_revenue`] += it.total_price;
      rows[i][`${kind}_profit`] += it.profit;
      rows[i][`${kind}_qty`] += it.quantity;
      rows[i].items_sold += it.quantity;
      const map = kind === 'products' ? topProducts : topServices;
      const cur = map.get(it.name) || { name: it.name, revenue: 0, profit: 0, quantity: 0 };
      cur.revenue += it.total_price;
      cur.profit += it.profit;
      cur.quantity += it.quantity;
      map.set(it.name, cur);
    });
    (sale.payments || []).forEach((p) => {
      if (p.payment_status !== 'paid') return;
      const cur = methods.get(p.payment_method) || { method: p.payment_method, amount: 0, count: 0 };
      cur.amount += p.amount;
      cur.count += 1;
      methods.set(p.payment_method, cur);
    });
  });

  rows.forEach((r) => {
    r.revenue = round2(r.products_revenue + r.services_revenue);
    r.profit = round2(r.products_profit + r.services_profit);
    ['products_revenue', 'services_revenue', 'products_profit', 'services_profit'].forEach((k) => (r[k] = round2(r[k])));
  });

  const current = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const pct = (a, b) => (b > 0 ? round2((a / b) * 100) : 0);
  const part = (kind) => ({
    revenue: current[`${kind}_revenue`],
    profit: current[`${kind}_profit`],
    quantity: current[`${kind}_qty`],
    margin_pct: pct(current[`${kind}_profit`], current[`${kind}_revenue`]),
    share_pct: pct(current[`${kind}_revenue`], current.revenue),
  });
  const rank = (map) => [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((r) => ({ ...r, revenue: round2(r.revenue), profit: round2(r.profit) }));

  res.json({
    period,
    series: rows,
    current: {
      ...current,
      margin_pct: pct(current.profit, current.revenue),
      avg_ticket: current.sales_count > 0 ? round2(current.revenue / current.sales_count) : 0,
    },
    previous,
    delta_revenue_pct: previous.revenue > 0 ? round2(((current.revenue - previous.revenue) / previous.revenue) * 100) : null,
    split: { products: part('products'), services: part('services') },
    goal: {
      target,
      progress: target > 0 ? round2((current.revenue / target) * 100) : null,
      remaining: target > 0 ? round2(Math.max(0, target - current.revenue)) : null,
    },
    top: { products: rank(topProducts), services: rank(topServices) },
    methods: [...methods.values()].sort((a, b) => b.amount - a.amount).map((m) => ({ ...m, amount: round2(m.amount) })),
  });
});