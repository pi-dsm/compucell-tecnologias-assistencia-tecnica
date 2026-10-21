const Holiday = require('../models/Holiday');
const { nationalHolidays, toKey } = require('../utils/businessDays');
const { getCalendar } = require('../services/calendar.service');
const { asyncHandler, pick, httpError } = require('../utils/helpers');

// GET /holidays?year=2026 -> feriados nacionais do ano + todos os locais cadastrados
exports.list = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const custom = await Holiday.find().sort({ date: 1 });
  res.json({ year, national: nationalHolidays(year), custom });
});

// GET /holidays/preview?days=5 -> data prevista após N dias úteis (útil para conferência)
exports.preview = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10);
  if (!Number.isInteger(days) || days < 0 || days > 90) throw httpError(400, 'Informe de 0 a 90 dias úteis');
  const calendar = await getCalendar();
  res.json({ days, date: toKey(calendar.addBusinessDays(new Date(), days)) });
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await Holiday.create(pick(req.body, ['date', 'name', 'scope'])));
});

exports.remove = asyncHandler(async (req, res) => {
  const holiday = await Holiday.findByIdAndDelete(req.params.id);
  if (!holiday) throw httpError(404, 'Feriado não encontrado');
  res.json({ message: 'Feriado removido' });
});