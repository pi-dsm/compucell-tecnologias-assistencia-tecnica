const Customer = require('../models/Customer');
const { asyncHandler, pick, clean, parseLimit } = require('../utils/helpers');

const FIELDS = ['name', 'phone', 'alternative_phone'];

exports.list = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const filter = { is_active: true, ...(q ? Customer.searchFilter(q) : {}) };
  res.json(await Customer.find(filter).sort({ name: 1 }).limit(parseLimit(req.query.limit, 20, 100)));
});

exports.create = asyncHandler(async (req, res) => {
  const customer = await Customer.create({ ...pick(clean(req.body), FIELDS), created_by: req.user._id });
  res.status(201).json(customer);
});

exports.get = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Cliente não encontrado' });
  res.json(customer);
});

exports.update = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Cliente não encontrado' });
  customer.set(pick(req.body, FIELDS));
  await customer.save();
  res.json(customer);
});