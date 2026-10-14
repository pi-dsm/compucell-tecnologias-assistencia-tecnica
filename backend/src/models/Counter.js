const mongoose = require('mongoose');

const schema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.models.Counter || mongoose.model('Counter', schema);

// Retorna start + próximo número da sequência (atômico).
async function nextSequence(name, start = 0) {
  const doc = await Counter.findByIdAndUpdate(name, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return start + doc.seq;
}

module.exports = { Counter, nextSequence };