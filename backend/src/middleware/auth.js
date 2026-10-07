const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
  const [type, token] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !token) return res.status(401).json({ message: 'Token não informado' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user || !user.is_active) return res.status(401).json({ message: 'Usuário inválido ou desativado' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
};

exports.authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Acesso negado' });