// Cópia da lógica de backend/src/utils/businessDays.js (mesma regra de contagem e de feriados).
// Se mudar um arquivo, mude o outro.

const pad = (n) => String(n).padStart(2, '0');
const noon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
const addCalendarDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0);
export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

export function easterSunday(year) {
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

export function nationalHolidays(year) {
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

export function createHolidayCalendar(customDates = []) {
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