const mongoose = require('mongoose');

const { Schema } = mongoose;

const CATEGORIES = ['accessory', 'stationery', 'keyboard', 'screen_protector', 'lighting', 'other'];

const schema = new Schema(
  {
    name: { type: String, required: [true, 'Nome do produto é obrigatório'], trim: true },
    barcode: { type: String, required: [true, 'Código de barras é obrigatório'], unique: true, trim: true },
    category: { type: String, enum: { values: CATEGORIES, message: 'Categoria inválida' }, default: 'other' },
    description: { type: String, trim: true },
    cost_price: { type: Number, min: [0, 'Custo inválido'], default: 0 },
    sale_price: { type: Number, required: [true, 'Preço de venda é obrigatório'], min: [0, 'Preço inválido'] },
    stock_quantity: {
      type: Number,
      min: [0, 'Estoque não pode ser negativo'],
      default: 0,
      validate: { validator: Number.isInteger, message: 'Estoque deve ser um número inteiro' },
    },
    min_stock: { type: Number, min: 0, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.index({ name: 1 });

schema.virtual('is_low_stock').get(function () {
  return this.stock_quantity <= this.min_stock;
});

schema.set('toJSON', { virtuals: true, versionKey: false });

const Product = mongoose.model('Product', schema);
module.exports = Product;
module.exports.CATEGORIES = CATEGORIES;