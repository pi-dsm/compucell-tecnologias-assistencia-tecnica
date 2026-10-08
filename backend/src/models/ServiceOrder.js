const mongoose = require('mongoose');
const { round2, formatBRL } = require('../utils/money');

const { Schema, Types } = mongoose;
const METHODS = ['credit_card', 'debit_card', 'cash', 'pix'];
const STATUSES = ['received', 'in_diagnosis', 'in_repair', 'ready', 'delivered', 'cancelled'];

const Counter =
  mongoose.models.Counter ||
  mongoose.model('Counter', new Schema({ _id: String, seq: { type: Number, default: 0 } }));

const paymentSchema = new Schema({
  amount: { type: Number, required: true, min: [0.01, 'Valor do pagamento inválido'] },
  payment_method: { type: String, enum: METHODS, required: true },
  payment_status: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'paid' },
  paid_at: { type: Date, default: Date.now },
});

const partSchema = new Schema(
  {
    part_id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },
    part_name: { type: String, required: [true, 'Nome da peça é obrigatório'], trim: true },
    cost_price: { type: Number, min: 0, default: 0 },
    selling_price: { type: Number, min: 0, default: 0 },
    quantity: { type: Number, min: 1, default: 1 },
    supplier_name: String,
    supplier_info: String,
  },
  { _id: false }
);

const schema = new Schema(
  {
    service_order_number: { type: Number, unique: true },
    customer: {
      customer_id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },
      customer_name: { type: String, required: [true, 'Nome do cliente é obrigatório'], trim: true },
      customer_phone: { type: String, required: [true, 'Telefone do cliente é obrigatório'], trim: true },
      customer_alternative_phone: { type: String, trim: true },
    },
    device: {
      device_id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },
      device_type: { type: String, default: 'Celular' },
      device_brand: { type: String, required: [true, 'Marca é obrigatória'], trim: true },
      device_model: { type: String, required: [true, 'Modelo é obrigatório'], trim: true },
      device_serial_number: { type: String, required: false },
      device_extra_info: { type: String, required: false },
      passcode_pin: { type: String, required: false },
      passcode_written: { type: String, required: false },
      passcode_pattern: { type: Schema.Types.Mixed, required: false },
    },
    reported_issue: { type: String, required: [true, 'Problema relatado é obrigatório'] },
    physical_condition: { type: String, required: false, default: '' },
    acessories_left_behind:  { type: String, required: false },
    estimated_budget_days: { type: Number, default: 1, min: 0 },
    status: { type: String, enum: STATUSES, default: 'received' },
    parts_total_amount: { type: Number, default: 0 },
    labor_total_amount: { type: Number, default: 0, min: 0 },
    discount_amount: { type: Number, default: 0, min: 0 },
    grand_total_amount: { type: Number, default: 0 },
    profit_amount: { type: Number, default: 0 },
    estimated_delivery_at: { type: Date, required: false },
    finished_at: { type: Date, required: false },
    delivered_at: { type: Date, required: false },
    internal_notes: { type: String, required: false },
    parts_used: [partSchema],
    payments: [paymentSchema],
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.statics.nextNumber = async function () {
  const c = await Counter.findByIdAndUpdate('service_order', { $inc: { seq: 1 } }, { new: true, upsert: true });
  return 1000 + c.seq;
};

schema.methods.recalculate = function () {
  const parts = this.parts_used || [];
  const sell = parts.reduce((s, p) => s + p.selling_price * p.quantity, 0);
  const cost = parts.reduce((s, p) => s + p.cost_price * p.quantity, 0);
  this.parts_total_amount = round2(sell);
  this.grand_total_amount = round2(Math.max(0, sell + this.labor_total_amount - this.discount_amount));
  this.profit_amount = round2(this.grand_total_amount - cost); // lucro = venda - custo
};

schema.pre('validate', function (next) {
  this.recalculate();
  next();
});

schema.virtual('paid_amount').get(function () {
  return round2(
    (this.payments || []).reduce(
      (s, p) => s + (p.payment_status === 'paid' ? p.amount : p.payment_status === 'refunded' ? -p.amount : 0),
      0
    )
  );
});
schema.virtual('balance_due').get(function () {
  return round2(Math.max(0, this.grand_total_amount - this.paid_amount));
});
schema.virtual('grand_total_formatted').get(function () {
  return formatBRL(this.grand_total_amount);
});
schema.virtual('profit_formatted').get(function () {
  return formatBRL(this.profit_amount);
});

schema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('ServiceOrder', schema);
module.exports.STATUSES = STATUSES;
module.exports.METHODS = METHODS;