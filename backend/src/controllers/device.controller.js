const Device = require('../models/Device');
const Customer = require('../models/Customer');
const { asyncHandler, pick, clean } = require('../utils/helpers');

const FIELDS = ['device_type', 'brand', 'model', 'passcode'];

exports.create = asyncHandler(async (req, res) => {
  const body = clean(req.body);
  const customer = await Customer.findById(body.customer_id);
  if (!customer) return res.status(404).json({ message: 'Cliente não encontrado' });
  const device = await Device.create({ ...pick(body, FIELDS), customer: customer._id });
  res.status(201).json(device);
});

exports.listByCustomer = asyncHandler(async (req, res) => {
  res.json(await Device.find({ customer: req.params.id }).sort({ updated_at: -1 }));
});

exports.get = asyncHandler(async (req, res) => {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).json({ message: 'Aparelho não encontrado' });
  res.json(device);
});

exports.update = asyncHandler(async (req, res) => {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).json({ message: 'Aparelho não encontrado' });
  device.set(pick(clean(req.body), FIELDS));
  await device.save();
  res.json(device);
});