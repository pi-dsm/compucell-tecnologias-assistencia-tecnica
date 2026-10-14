const mongoose = require('mongoose');

const { Schema } = mongoose;

const DEVICE_TYPES = ['phone', 'tablet', 'laptop', 'desktop', 'console', 'smartwatch', 'tv', 'other'];
const PASSCODE_KINDS = ['none', 'pin', 'written', 'pattern'];

const passcodeSchema = new Schema(
  {
    kind: { type: String, enum: PASSCODE_KINDS, default: 'none' },
    pin: { type: String, trim: true },
    written: { type: String, trim: true },
    pattern: { type: [Number], default: undefined }, // pontos 0..8 na ordem do desenho
  },
  { _id: false }
);

const schema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: [true, 'Cliente do aparelho é obrigatório'], index: true },
    device_type: { type: String, enum: { values: DEVICE_TYPES, message: 'Tipo de aparelho inválido' }, default: 'phone', required: true },
    brand: { type: String, required: [true, 'Marca é obrigatória'], trim: true },
    model: { type: String, required: [true, 'Modelo é obrigatório'], trim: true },
    passcode: { type: passcodeSchema, default: () => ({ kind: 'none' }) },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Valida o campo correspondente ao tipo de senha e limpa os demais.
schema.pre('validate', function (next) {
  const p = this.passcode || { kind: 'none' };
  if (p.kind !== 'pin') p.pin = undefined;
  if (p.kind !== 'written') p.written = undefined;
  if (p.kind !== 'pattern') p.pattern = undefined;

  if (p.kind === 'pin' && !/^\d{4,8}$/.test(p.pin || '')) {
    this.invalidate('passcode.pin', 'O PIN deve ter de 4 a 8 dígitos');
  }
  if (p.kind === 'written' && !(p.written || '').trim()) {
    this.invalidate('passcode.written', 'Informe a senha escrita');
  }
  if (p.kind === 'pattern') {
    const pattern = p.pattern || [];
    const valid =
      pattern.length >= 4 &&
      new Set(pattern).size === pattern.length &&
      pattern.every((n) => Number.isInteger(n) && n >= 0 && n <= 8);
    if (!valid) this.invalidate('passcode.pattern', 'Padrão inválido: ligue ao menos 4 pontos, sem repetir');
  }
  next();
});

schema.set('toJSON', { virtuals: true, versionKey: false });

const Device = mongoose.model('Device', schema);
module.exports = Device;
module.exports.DEVICE_TYPES = DEVICE_TYPES;
module.exports.PASSCODE_KINDS = PASSCODE_KINDS;