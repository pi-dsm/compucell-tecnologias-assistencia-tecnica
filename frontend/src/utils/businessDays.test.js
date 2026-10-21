import test from 'node:test';
import assert from 'node:assert/strict';
import { createHolidayCalendar, toKey } from './businessDays.js';

const cal = createHolidayCalendar();

test('quarta + 5 dias úteis cai na quarta seguinte', () => {
  assert.equal(toKey(cal.addBusinessDays(new Date(2026, 9, 21), 5)), '2026-10-28');
});

test('pula a Sexta-feira Santa e feriados locais recorrentes', () => {
  assert.equal(toKey(cal.addBusinessDays(new Date(2026, 3, 2), 2)), '2026-04-07');
  const local = createHolidayCalendar(['06-15']);
  assert.equal(toKey(local.addBusinessDays(new Date(2026, 5, 12), 1)), '2026-06-16');
});

test('isBusinessDay reconhece fim de semana e feriado', () => {
  assert.equal(cal.isBusinessDay(new Date(2026, 9, 24)), false); // sábado
  assert.equal(cal.isBusinessDay(new Date(2026, 10, 20)), false); // Consciência Negra (sexta)
  assert.equal(cal.isBusinessDay(new Date(2026, 9, 22)), true);
});