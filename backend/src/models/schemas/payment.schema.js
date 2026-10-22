const mongoose = require('mongoose');

const PAYMENT_METHODS = ['cash', 'pix', 'credit_card', 'debit_card'];
const PAYMENT_STATUSES = ['paid', 'pending', 'refunded'];

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: [0.01, 'Valor do pagamento inválido'] },
  payment_method: { type: String, enum: PAYMENT_METHODS, required: [true, 'Forma de pagamento é obrigatória'] },
  installments: { type: Number, min: [1, 'Número de parcelas inválido'], max: [12, 'Máximo de 12 parcelas'], default: 1 },
  payment_status: { type: String, enum: PAYMENT_STATUSES, default: 'paid' },
  paid_at: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
});

module.exports = { paymentSchema, PAYMENT_METHODS, PAYMENT_STATUSES };