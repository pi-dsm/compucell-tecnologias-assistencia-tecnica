const Service = require('../models/Service');
const { asyncHandler, pick, clean } = require('../utils/helpers');

const FIELDS = ['name', 'description', 'price', 'cost_price'];

exports.list = asyncHandler(async (req, res) => {
  const filter = req.query.active === 'all' ? {} : { is_active: true };
  res.json(await Service.find(filter).sort({ name: 1 }));
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await Service.create(pick(clean(req.body), FIELDS)));
});

exports.update = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ message: 'Serviço não encontrado' });
  service.set(pick(clean(req.body), FIELDS));
  if (req.body.is_active !== undefined) service.is_active = !!req.body.is_active;
  await service.save();
  res.json(service);
});

exports.remove = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
  if (!service) return res.status(404).json({ message: 'Serviço não encontrado' });
  res.json(service);
});