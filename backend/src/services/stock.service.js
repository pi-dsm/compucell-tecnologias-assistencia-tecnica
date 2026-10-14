const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// Baixa atômica: só altera se houver saldo suficiente. Retorna o produto atualizado ou null.
exports.takeStock = (productId, quantity) =>
  Product.findOneAndUpdate(
    { _id: productId, is_active: true, stock_quantity: { $gte: quantity } },
    { $inc: { stock_quantity: -quantity } },
    { new: true }
  );

exports.returnStock = (productId, quantity) =>
  Product.findByIdAndUpdate(productId, { $inc: { stock_quantity: quantity } }, { new: true });

exports.logMovements = (rows) => (rows.length ? StockMovement.insertMany(rows) : Promise.resolve([]));