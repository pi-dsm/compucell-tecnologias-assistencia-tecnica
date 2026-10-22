const mongoose = require('mongoose');
const { nextSequence } = require('./Counter');
const { paymentSchema } = require('./schemas/payment.schema');
const { round2, formatBRL } = require('../utils/money');
const { netPaid, paymentState } = require('../utils/payments');

const { Schema } = mongoose;

const OPEN_STATUSES = ['received', 'in_diagnosis', 'in_repair', 'ready'];
const CLOSED_STATUSES = ['delivered', 'cancelled', 'returned'];
const STATUSES = [...OPEN_STATUSES, ...CLOSED_STATUSES];

const partSchema = new Schema(
  {
    part_name: { type: String, required: [true, 'Nome da peça é obrigatório'], trim: true },
    is_own_stock: { type: Boolean, default: false }, // fornecedor próprio => custo zero
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    supplier_name: { type: String, trim: true },
    supplier_contact: { type: String, trim: true },
    purchase_reference: { type: String, trim: true }, // OS / nota de compra no fornecedor
    cost_price: { type: Number, min: [0, 'Custo da peça inválido'], required: [true, 'Informe o custo de compra da peça'] },
    sale_price: { type: Number, min: [0, 'Valor de venda da peça inválido'], required: [true, 'Informe o valor de venda da peça'] },
    quantity: { type: Number, min: [1, 'Quantidade mínima da peça é 1'], default: 1 },
    warranty_days: { type: Number, min: 0 }, // opcional
  },
  { _id: false }
);

partSchema.pre('validate', function (next) {
  if (this.is_own_stock) {
    this.cost_price = 0;
    this.supplier = undefined;
    this.supplier_name = undefined;
    this.supplier_contact = undefined;
    this.purchase_reference = undefined;
  } else {
    if (!this.supplier) this.invalidate('supplier', 'Selecione o fornecedor da peça');
    if (!this.purchase_reference) this.invalidate('purchase_reference', 'Informe a OS/nota de compra da peça');
  }
  next();
});

const historySchema = new Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    changed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    changed_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const schema = new Schema(
  {
    // Número da OS
    service_order_number: { type: Number, unique: true },

    // Faz referência ao cliente e ao aparelho
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: [true, 'Cliente é obrigatório'], index: true },
    device: { type: Schema.Types.ObjectId, ref: 'Device', required: [true, 'Aparelho é obrigatório'], index: true },

    // Retorno em garantia
    origin_order: { type: Schema.Types.ObjectId, ref: 'ServiceOrder', index: true },
    is_warranty: { type: Boolean, default: false },

    // Obrigatórios na abertura
    reported_issue: { type: String, required: [true, 'Problema relatado é obrigatório'] },
    estimated_budget_at: { type: Date, required: [true, 'Previsão de orçamento é obrigatória'] },
    estimated_delivery_at: { type: Date, required: [true, 'Previsão de entrega é obrigatória'] },

    // Opcional na assistência técnica
    internal_notes: { type: String, trim: true },

    // Em relação ao status
    status: { type: String, enum: STATUSES, default: 'received' },
    status_history: [historySchema],

    // Em relação à assitência técnica
    parts_used: [partSchema],
    no_parts_used: { type: Boolean, default: false },
    labor_amount: { type: Number, min: [0, 'Valor da mão de obra inválido'], default: 0 },

    // No fechamento
    discount_amount: { type: Number, min: [0, 'Desconto inválido'], default: 0 },
    payments: [paymentSchema],

    // Totais (recalculados a cada validação)
    parts_total_amount: { type: Number, default: 0 },
    cost_total_amount: { type: Number, default: 0 },
    grand_total_amount: { type: Number, default: 0 },
    profit_amount: { type: Number, default: 0 },

    ready_at: Date,
    delivered_at: Date,
    warranty_days: { type: Number, min: 0 },
    warranty_until: Date,

    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.index({ status: 1, updated_at: -1 });
schema.index({ created_at: -1 });
schema.index({ delivered_at: -1 });

// lucro = valor cobrado - custo das peças | OS de garantia não cobra nada (lucro = -custo)
schema.methods.recalculate = function () {
  const parts = this.parts_used || [];
  const sell = parts.reduce((s, p) => s + (p.sale_price || 0) * (p.quantity || 1), 0);
  // peça de estoque próprio tem custo zero (o hook da peça também força isso, mas roda depois deste)
  const cost = parts.reduce((s, p) => s + (p.is_own_stock ? 0 : p.cost_price || 0) * (p.quantity || 1), 0);
  const gross = sell + (this.labor_amount || 0);

  this.parts_total_amount = round2(sell);
  this.cost_total_amount = round2(cost);
  this.discount_amount = round2(Math.min(this.discount_amount || 0, gross));
  this.grand_total_amount = this.is_warranty ? 0 : round2(Math.max(0, gross - this.discount_amount));
  this.profit_amount = round2(this.grand_total_amount - cost);
};

schema.methods.setStatus = function (status, userId) {
  this.status = status;
  this.status_history.push({ status, changed_by: userId, changed_at: new Date() });
  this.updated_by = userId;
};

schema.pre('validate', async function () {
  if (this.isNew && !this.service_order_number) {
    this.service_order_number = await nextSequence('service_order', 1000);
  }
  this.recalculate();
});

schema.virtual('paid_amount').get(function () {
  return netPaid(this.payments);
});
schema.virtual('balance_due').get(function () {
  return round2(Math.max(0, this.grand_total_amount - netPaid(this.payments)));
});
schema.virtual('payment_state').get(function () {
  return paymentState(this.grand_total_amount, netPaid(this.payments));
});
schema.virtual('warranty_loss_amount').get(function () {
  return this.is_warranty ? round2(Math.max(0, -this.profit_amount)) : 0;
});
schema.virtual('is_under_warranty').get(function () {
  return !!this.warranty_until && this.warranty_until.getTime() >= Date.now();
});
schema.virtual('grand_total_formatted').get(function () {
  return formatBRL(this.grand_total_amount);
});

schema.set('toJSON', { virtuals: true, versionKey: false });

const ServiceOrder = mongoose.model('ServiceOrder', schema);
module.exports = ServiceOrder;
module.exports.STATUSES = STATUSES;
module.exports.OPEN_STATUSES = OPEN_STATUSES;
module.exports.CLOSED_STATUSES = CLOSED_STATUSES;