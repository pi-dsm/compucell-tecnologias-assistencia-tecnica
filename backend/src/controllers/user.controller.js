const argon2 = require('argon2');
const User = require('../models/User');
const { asyncHandler, pick } = require('../utils/helpers');

exports.create = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ message: 'Senha deve ter ao menos 6 caracteres' });
  const user = await User.create({
    ...pick(req.body, ['name', 'email', 'phone', 'role']),
    password: await argon2.hash(password),
  });
  res.status(201).json(user);
});

exports.list = asyncHandler(async (req, res) => {
  res.json(await User.find().sort({ name: 1 }));
});

exports.get = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  res.json(user);
});

exports.update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  user.set(pick(req.body, ['name', 'email', 'phone', 'role', 'is_active']));
  if (req.body.password) {
    if (req.body.password.length < 6) return res.status(400).json({ message: 'Senha deve ter ao menos 6 caracteres' });
    user.password = await argon2.hash(req.body.password);
  }
  await user.save();
  res.json(user);
});

exports.toggleStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({ message: 'Você não pode desativar o próprio acesso' });
  }
  user.is_active = !user.is_active;
  await user.save();
  res.json(user);
});