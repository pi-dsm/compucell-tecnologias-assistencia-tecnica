const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Nome é obrigatório'], trim: true },
    email: { type: String, required: [true, 'E-mail é obrigatório'], unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['admin', 'technician', 'attendant'], default: 'attendant' },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', schema);