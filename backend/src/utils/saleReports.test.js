const test = require('node:test');
const assert = require('node:assert/strict');
const { allocateItems } = require('./saleReports');

test('rateia o desconto proporcionalmente e calcula lucro por item', () => {
  const sale = {
    subtotal_amount: 100,
    discount_amount: 10,
    items: [
      { item_type: 'product', name: 'A', quantity: 2, unit_price: 30, unit_cost: 10 }, // 60 bruto
      { item_type: 'service', name: 'B', quantity: 1, unit_price: 40, unit_cost: 0 }, // 40 bruto
    ],
  };
  const [a, b] = allocateItems(sale);
  assert.equal(a.discount_share, 6);
  assert.equal(a.total_price, 54);
  assert.equal(a.total_cost, 20);
  assert.equal(a.profit, 34);
  assert.equal(a.profit_pct, 62.96);
  assert.equal(b.discount_share, 4);
  assert.equal(b.total_price, 36);
  assert.equal(b.profit, 36);
  assert.equal(b.profit_pct, 100);
});

test('venda sem desconto mantém os valores cheios', () => {
  const [row] = allocateItems({ subtotal_amount: 25, discount_amount: 0, items: [{ item_type: 'product', name: 'P', quantity: 1, unit_price: 25, unit_cost: 5 }] });
  assert.equal(row.total_price, 25);
  assert.equal(row.profit, 20);
  assert.equal(row.profit_pct, 80);
});