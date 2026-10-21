const Holiday = require('../models/Holiday');
const { createHolidayCalendar } = require('../utils/businessDays');

// Calendário com os feriados nacionais + os locais cadastrados.
exports.getCalendar = async () => {
  const custom = await Holiday.find().select('date').lean();
  return createHolidayCalendar(custom.map((h) => h.date));
};