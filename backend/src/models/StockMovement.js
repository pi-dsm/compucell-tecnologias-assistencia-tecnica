const mongoose = require('mongoose');

const { Schema } = mongoose;

const schema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    kind: { type: String, enum: ['initial', 'sale', 'refund', 'adjustment'], required: true },
    quantity: { type: Number, required: true }, // com sinal: negativo = saída
    balance_after: { type: Number, required: true },
    reason: { type: String, trim: true },
    sale: { type: Schema.Types.ObjectId, ref: 'Sale' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

schema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('StockMovement', schema);