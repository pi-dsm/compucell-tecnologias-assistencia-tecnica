const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Nome do serviço é obrigatório'], trim: true, unique: true },
    description: { type: String, trim: true },
    price: { type: Number, required: [true, 'Preço do serviço é obrigatório'], min: [0, 'Preço inválido'] },
    cost_price: { type: Number, min: 0, default: 0 }, // custo de insumo (ex.: papel e toner por cópia)
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Service', schema);