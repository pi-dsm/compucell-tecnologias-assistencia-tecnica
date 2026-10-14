const mongoose = require('mongoose');
const { nextSequence } = require('./Counter');
const { paymentSchema } = require('./schemas/payment.schema');
const { round2, formatBRL } = require('../utils/money');
const { netPaid, paymentState } = require('../utils/payments');

const { Schema } = mongoose;

const itemSchema = new Schema(
  {
    item_type: { type: String, enum: ['product', 'service'], required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    service: { type: Schema.Types.ObjectId, ref: 'Service' },
    // Snapshot: o histórico não muda se o cadastro for editado depois
    name: { type: String, required: [true, 'Nome do item é obrigatório'], trim: true },
    barcode: { type: String, trim: true },
    quantity: {
      type: Number,
      min: [1, 'Quantidade mínima é 1'],
      default: 1,
      validate: { validator: Number.isInteger, message: 'Quantidade deve ser inteira' },
    },
    unit_price: { type: Number, required: true, min: [0, 'Preço inválido'] },
    unit_cost: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const schema = new Schema(
  {
    sale_number: { type: Number, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' }, // opcional; obrigatório se houver saldo pendente
    items: { type: [itemSchema], validate: [(v) => v.length > 0, 'A venda precisa ter ao menos 1 item'] },
    subtotal_amount: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0, min: 0 },
    grand_total_amount: { type: Number, default: 0 },
    cost_total_amount: { type: Number, default: 0 },
    profit_amount: { type: Number, default: 0 },
    refunded_amount: { type: Number, default: 0 },
    restocked: { type: Boolean, default: false },
    payments: [paymentSchema],
    notes: { type: String, trim: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.index({ created_at: -1 });

// lucro = valor da venda - custo (proporcionalmente reduzido por estornos)
schema.methods.recalculate = function () {
  const sell = this.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const cost = this.items.reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0);
  this.subtotal_amount = round2(sell);
  this.discount_amount = round2(Math.min(this.discount_amount || 0, sell));
  this.grand_total_amount = round2(sell - this.discount_amount);
  this.cost_total_amount = round2(cost);
  const kept = this.grand_total_amount > 0 ? Math.max(0, (this.grand_total_amount - this.refunded_amount) / this.grand_total_amount) : 1;
  this.profit_amount = round2((this.grand_total_amount - cost) * kept);
};

schema.pre('validate', async function () {
  if (this.isNew && !this.sale_number) this.sale_number = await nextSequence('sale', 0);
  this.recalculate();
});

schema.virtual('paid_amount').get(function () {
  return netPaid(this.payments);
});
schema.virtual('balance_due').get(function () {
  return round2(Math.max(0, this.grand_total_amount - this.refunded_amount - netPaid(this.payments)));
});
schema.virtual('payment_state').get(function () {
  return paymentState(this.grand_total_amount - this.refunded_amount, netPaid(this.payments));
});
schema.virtual('grand_total_formatted').get(function () {
  return formatBRL(this.grand_total_amount);
});

schema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Sale', schema);