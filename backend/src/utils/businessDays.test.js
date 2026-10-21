const test = require('node:test');
const assert = require('node:assert/strict');
const { createHolidayCalendar, nationalHolidays, toKey } = require('./businessDays');

const cal = createHolidayCalendar();
const key = (d) => toKey(d);

test('quarta + 5 dias úteis cai na quarta seguinte', () => {
  assert.equal(key(cal.addBusinessDays(new Date(2026, 9, 21), 5)), '2026-10-28');
});

test('pula a Sexta-feira Santa de 2026 (03/04)', () => {
  assert.equal(key(cal.addBusinessDays(new Date(2026, 3, 2), 2)), '2026-04-07');
});

test('a contagem a partir de um sábado começa na segunda', () => {
  assert.equal(key(cal.addBusinessDays(new Date(2026, 9, 24), 1)), '2026-10-26');
  assert.equal(key(cal.addBusinessDays(new Date(2026, 9, 24), 0)), '2026-10-26');
});

test('feriado local recorrente (MM-DD) é ignorado', () => {
  const local = createHolidayCalendar(['06-15']);
  assert.equal(key(local.addBusinessDays(new Date(2026, 5, 12), 1)), '2026-06-16');
});

test('atravessa a virada de ano ignorando 01/01', () => {
  assert.equal(key(cal.addBusinessDays(new Date(2026, 11, 30), 2)), '2027-01-04');
});

test('feriados nacionais: Consciência Negra só a partir de 2024', () => {
  assert.ok(nationalHolidays(2026).some((h) => h.date === '2026-04-03' && h.name === 'Sexta-feira Santa'));
  assert.ok(nationalHolidays(2026).some((h) => h.date === '2026-11-20'));
  assert.ok(!nationalHolidays(2023).some((h) => h.date === '2023-11-20'));
});