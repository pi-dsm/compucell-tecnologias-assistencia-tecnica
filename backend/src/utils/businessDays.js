// Cálculo de prazos em dias úteis (sem sábados, domingos e feriados).
// ATENÇÃO: existe uma cópia deste arquivo no frontend (frontend/src/utils/businessDays.js).
// Mantenha as duas idênticas, exceto pela sintaxe de exportação (CommonJS x ESM).
//
// As datas são tratadas como "dia de calendário" ao meio-dia local, evitando erros de fuso e horário de verão.

const pad = (n) => String(n).padStart(2, '0');
const noon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
const addCalendarDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0);
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // AAAA-MM-DD
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher)
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12, 0, 0);
}

// Feriados nacionais do ano: [{ date: 'AAAA-MM-DD', name }]
function nationalHolidays(year) {
  const list = [
    [`${year}-01-01`, 'Confraternização Universal'],
    [toKey(addCalendarDays(easterSunday(year), -2)), 'Sexta-feira Santa'],
    [`${year}-04-21`, 'Tiradentes'],
    [`${year}-05-01`, 'Dia do Trabalho'],
    [`${year}-09-07`, 'Independência do Brasil'],
    [`${year}-10-12`, 'Nossa Senhora Aparecida'],
    [`${year}-11-02`, 'Finados'],
    [`${year}-11-15`, 'Proclamação da República'],
    ...(year >= 2024 ? [[`${year}-11-20`, 'Dia da Consciência Negra']] : []),
    [`${year}-12-25`, 'Natal'],
  ];
  return list.map(([date, name]) => ({ date, name })).sort((x, y) => x.date.localeCompare(y.date));
}

// customDates: feriados locais. 'AAAA-MM-DD' (data única) ou 'MM-DD' (repete todo ano).
function createHolidayCalendar(customDates = []) {
  const exact = new Set(customDates.filter((k) => k.length === 10));
  const yearly = new Set(customDates.filter((k) => k.length === 5));
  const cache = new Map();

  const nationalKeys = (year) => {
    if (!cache.has(year)) cache.set(year, new Set(nationalHolidays(year).map((h) => h.date)));
    return cache.get(year);
  };
  const isHoliday = (date) => {
    const key = toKey(date);
    return nationalKeys(date.getFullYear()).has(key) || exact.has(key) || yearly.has(key.slice(5));
  };
  const isBusinessDay = (date) => !isWeekend(date) && !isHoliday(date);

  // Soma `days` dias úteis a partir de `start` (o dia de `start` não conta).
  // days = 0 devolve o próprio dia, ou o próximo dia útil se ele não for útil.
  function addBusinessDays(start, days) {
    let cursor = noon(start);
    let left = Math.max(0, Math.floor(Number(days) || 0));
    if (left === 0) {
      while (!isBusinessDay(cursor)) cursor = addCalendarDays(cursor, 1);
      return cursor;
    }
    while (left > 0) {
      cursor = addCalendarDays(cursor, 1);
      if (isBusinessDay(cursor)) left -= 1;
    }
    return cursor;
  }

  return { isHoliday, isBusinessDay, addBusinessDays };
}

module.exports = { createHolidayCalendar, nationalHolidays, easterSunday, toKey };