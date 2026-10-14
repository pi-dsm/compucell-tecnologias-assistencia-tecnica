const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { asyncHandler, pick, clean, escapeRegex, parseLimit, httpError } = require('../utils/helpers');

const FIELDS = ['name', 'barcode', 'category', 'description', 'cost_price', 'sale_price', 'min_stock'];

exports.list = asyncHandler(async (req, res) => {
  const { q, category, low_stock, active } = req.query;
  const filter = {};
  if (active !== 'all') filter.is_active = true;
  if (category) filter.category = category;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [{ name: rx }, { barcode: rx }];
  }
  if (low_stock === 'true') filter.$expr = { $lte: ['$stock_quantity', '$min_stock'] };
  res.json(await Product.find(filter).sort({ name: 1 }).limit(parseLimit(req.query.limit, 100, 500)));
});

// Leitura rápida por leitor de código de barras (correspondência exata)
exports.getByBarcode = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ barcode: String(req.params.code).trim(), is_active: true });
  if (!product) return res.status(404).json({ message: 'Produto não encontrado para este código de barras' });
  res.json(product);
});

exports.get = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
  res.json(product);
});

exports.create = asyncHandler(async (req, res) => {
  const body = clean(req.body);
  const product = await Product.create({ ...pick(body, FIELDS), stock_quantity: Number(body.stock_quantity) || 0 });
  if (product.stock_quantity > 0) {
    await StockMovement.create({
      product: product._id,
      kind: 'initial',
      quantity: product.stock_quantity,
      balance_after: product.stock_quantity,
      reason: 'Estoque inicial',
      created_by: req.user._id,
    });
  }
  res.status(201).json(product);
});

// O estoque NÃO é alterado aqui: use PATCH /:id/stock para manter o histórico.
exports.update = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
  product.set(pick(clean(req.body), FIELDS));
  if (req.body.is_active !== undefined) product.is_active = !!req.body.is_active;
  await product.save();
  res.json(product);
});

exports.adjustStock = asyncHandler(async (req, res) => {
  const delta = Number(req.body.delta);
  const reason = String(req.body.reason || '').trim();
  if (!Number.isInteger(delta) || delta === 0) throw httpError(400, 'Informe uma quantidade inteira diferente de zero');
  if (!reason) throw httpError(400, 'Informe o motivo do ajuste');

  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, stock_quantity: { $gte: delta < 0 ? -delta : 0 } },
    { $inc: { stock_quantity: delta } },
    { new: true }
  );
  if (!product) throw httpError(409, 'Produto não encontrado ou estoque insuficiente para essa baixa');

  await StockMovement.create({
    product: product._id,
    kind: 'adjustment',
    quantity: delta,
    balance_after: product.stock_quantity,
    reason,
    created_by: req.user._id,
  });
  res.json(product);
});

exports.movements = asyncHandler(async (req, res) => {
  res.json(await StockMovement.find({ product: req.params.id }).sort({ created_at: -1 }).limit(100).populate('created_by', 'name'));
});

// Remoção lógica: preserva o histórico de vendas
exports.remove = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
  if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
  res.json(product);
});