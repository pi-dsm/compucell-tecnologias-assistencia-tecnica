const mongoose = require('mongoose');
const { onlyDigits } = require('../utils/helpers');
const { isValidDocument } = require('../utils/document');

const { Schema } = mongoose;

const schema = new Schema(
  {
    name: { type: String, required: [true, 'Nome do fornecedor é obrigatório'], trim: true },
    document: { type: String, trim: true }, // CNPJ ou CPF, como digitado
    document_digits: { type: String }, // somente números (busca e unicidade)
    contact_name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true, uppercase: true, match: [/^[A-Z]{2}$/, 'UF inválida (use 2 letras, ex.: SP)'] },
    notes: { type: String, trim: true },
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.index({ name: 1 });
// Único apenas quando informado (vários fornecedores podem ficar sem documento)
schema.index({ document_digits: 1 }, { unique: true, partialFilterExpression: { document_digits: { $type: 'string' } } });

schema.pre('validate', function (next) {
  const digits = onlyDigits(this.document);
  if (digits) {
    if (!isValidDocument(digits)) this.invalidate('document', 'CNPJ/CPF inválido');
    this.document_digits = digits;
  } else {
    this.document = undefined;
    this.document_digits = undefined;
  }
  next();
});

schema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Supplier', schema);