const mongoose = require('mongoose');
const { round2, formatBRL } = require('../utils/money');

const { Schema, Types } = mongoose;

const productSchema = new Schema(
  {
    product_id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },
    comercial_name: { type: String, required: [true, 'Nome do produto é obrigatório'], trim: true },
    category: { type: String, default: 'Geral' },
    specifications: String,
    cost_price: { type: Number, min: 0, default: 0 },
    selling_price: { type: Number, required: true, min: [0, 'Preço inválido'] },
    quantity: { type: Number, min: [1, 'Quantidade mínima é 1'], default: 1 },
  },
  { _id: false }
);

const paymentSchema = new Schema({
  amount: { type: Number, required: true, min: 0.01 },
  payment_method: { type: String, enum: ['credit_card', 'debit_card', 'cash', 'pix'], required: true },
  payment_status: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'paid' },
  paid_at: { type: Date, default: Date.now },
});

const schema = new Schema(
  {
    products_sold: { type: [productSchema], validate: [(v) => v.length > 0, 'A venda precisa ter ao menos 1 item'] },
    subtotal_amount: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0, min: 0 },
    grand_total_amount: { type: Number, default: 0 },
    profit_amount: { type: Number, default: 0 },
    refunded_amount: { type: Number, default: 0 },
    payments: [paymentSchema],
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

schema.methods.recalculate = function () {
  const sell = this.products_sold.reduce((s, p) => s + p.selling_price * p.quantity, 0);
  const cost = this.products_sold.reduce((s, p) => s + p.cost_price * p.quantity, 0);
  this.subtotal_amount = round2(sell);
  this.grand_total_amount = round2(Math.max(0, sell - this.discount_amount));
  this.profit_amount = round2(this.grand_total_amount - cost); // lucro = venda - custo
};

schema.pre('validate', function (next) {
  this.recalculate();
  next();
});

schema.virtual('grand_total_formatted').get(function () {
  return formatBRL(this.grand_total_amount);
});
schema.virtual('profit_formatted').get(function () {
  return formatBRL(this.profit_amount);
});

schema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Sale', schema);