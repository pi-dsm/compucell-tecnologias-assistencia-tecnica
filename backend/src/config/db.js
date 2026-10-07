const mongoose = require('mongoose');

module.exports = async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB conectado');
  } catch (err) {
    console.error('Falha ao conectar no MongoDB:', err.message);
    process.exit(1);
  }
};