const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// remove strings vazias recursivamente (evita erros de cast em datas/ObjectIds)
const clean = (obj) => {
  if (Array.isArray(obj)) return obj.map(clean);
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    return Object.entries(obj).reduce((acc, [k, v]) => {
      if (v === '' || v === null || v === undefined) return acc;
      acc[k] = clean(v);
      return acc;
    }, {});
  }
  return obj;
};

const pick = (obj, keys) => keys.reduce((a, k) => (obj[k] !== undefined ? { ...a, [k]: obj[k] } : a), {});
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

// Erro com status HTTP, tratado pelo middleware de erros do server.js
const httpError = (status, message) => Object.assign(new Error(message), { status });

const parseLimit = (value, fallback = 50, max = 500) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
};

module.exports = { asyncHandler, clean, pick, escapeRegex, onlyDigits, httpError, parseLimit };