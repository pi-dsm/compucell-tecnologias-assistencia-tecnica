const ServiceOrder = require('../models/ServiceOrder');
const Sale = require('../models/Sale');
const { asyncHandler } = require('../utils/helpers');
const { round2 } = require('../utils/money');

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

exports.summary = asyncHandler(async (req, res) => {
  const period = ['daily', 'weekly', 'monthly'].includes(req.query.period) ? req.query.period : 'daily';
  const buckets = buildBuckets(period);
  const from = buckets[0].start;

  const [received, in_diagnosis, in_repair, ready, orders, sales, closed, recent] = await Promise.all([
    ServiceOrder.countDocuments({ status: 'received' }),
    ServiceOrder.countDocuments({ status: 'in_diagnosis' }),
    ServiceOrder.countDocuments({ status: 'in_repair' }),
    ServiceOrder.countDocuments({ status: 'ready' }),
    ServiceOrder.find({ 'payments.paid_at': { $gte: from } }).select('payments').lean(),
    Sale.find({ 'payments.paid_at': { $gte: from } }).select('payments').lean(),
    ServiceOrder.find({ delivered_at: { $gte: from } }).select('delivered_at').lean(),
    ServiceOrder.find().sort({ updated_at: -1 }).limit(6),
  ]);

  const rows = buckets.map((b) => ({ label: b.label, faturamento: 0, os_fechadas: 0 }));
  const idx = (d) => buckets.findIndex((b) => d >= b.start && d < b.end);

  [...orders, ...sales].forEach((doc) =>
    doc.payments.forEach((p) => {
      const i = idx(new Date(p.paid_at));
      if (i < 0) return;
      if (p.payment_status === 'paid') rows[i].faturamento += p.amount;
      if (p.payment_status === 'refunded') rows[i].faturamento -= p.amount;
    })
  );
  closed.forEach((o) => {
    const i = idx(new Date(o.delivered_at));
    if (i >= 0) rows[i].os_fechadas += 1;
  });
  rows.forEach((r) => (r.faturamento = round2(r.faturamento)));

  res.json({
    period,
    counts: { received, in_diagnosis, in_repair, ready },
    chart: rows,
    total_revenue: round2(rows.reduce((s, r) => s + r.faturamento, 0)),
    recent,
  });
});