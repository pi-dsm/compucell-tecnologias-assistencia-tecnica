const { round2 } = require('./money');
const { PAYMENT_METHODS } = require('../models/schemas/payment.schema');
const { httpError } = require('./helpers');

// Total líquido recebido = pagos - estornados
function netPaid(payments = []) {
  return round2(
    payments.reduce(
      (sum, p) => sum + (p.payment_status === 'paid' ? p.amount : p.payment_status === 'refunded' ? -p.amount : 0),
      0
    )
  );
}

// 'unpaid' | 'partial' | 'paid'
function paymentState(total, paid) {
  if (total <= 0) return 'paid';
  if (paid <= 0) return 'unpaid';
  return paid + 0.001 >= total ? 'paid' : 'partial';
}

// Valida a lista vinda do cliente e devolve objetos prontos para persistir.
function normalizePayments(list) {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list)) throw httpError(400, 'Formato de pagamentos inválido');
  return list.map((p) => {
    const amount = round2(p.amount);
    if (!(amount > 0)) throw httpError(400, 'Informe um valor maior que zero em cada pagamento');
    if (!PAYMENT_METHODS.includes(p.payment_method)) throw httpError(400, 'Forma de pagamento inválida');
    return { amount, payment_method: p.payment_method, payment_status: 'paid', paid_at: new Date(), notes: p.notes };
  });
}

module.exports = { netPaid, paymentState, normalizePayments };