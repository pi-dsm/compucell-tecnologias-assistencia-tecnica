const { round2 } = require('./money');

// Linhas por item de uma venda, com o desconto rateado proporcionalmente ao subtotal de cada item.
// Aceita documento Mongoose ou objeto simples (lean).
exports.allocateItems = (sale) => {
  const items = sale.items || [];
  const subtotal = sale.subtotal_amount || items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const discount = sale.discount_amount || 0;

  return items.map((item) => {
    const gross = round2(item.unit_price * item.quantity);
    const discountShare = subtotal > 0 ? round2((gross / subtotal) * discount) : 0;
    const totalPrice = round2(gross - discountShare);
    const totalCost = round2((item.unit_cost || 0) * item.quantity);
    const profit = round2(totalPrice - totalCost);
    return {
      item_type: item.item_type,
      product_id: item.product ? String(item.product) : null,
      service_id: item.service ? String(item.service) : null,
      name: item.name,
      barcode: item.barcode || null,
      quantity: item.quantity,
      unit_cost: round2(item.unit_cost || 0),
      total_cost: totalCost,
      unit_price: round2(item.unit_price),
      discount_share: discountShare,
      total_price: totalPrice,
      profit,
      profit_pct: totalPrice > 0 ? round2((profit / totalPrice) * 100) : 0,
    };
  });
};