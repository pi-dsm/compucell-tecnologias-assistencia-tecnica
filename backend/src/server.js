process.env.TZ = process.env.TZ || 'America/Sao_Paulo';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/db');
const swaggerSpec = require('./config/swagger');

const app = express();
app.use(helmet({ contentSecurityPolicy: false })); // API pura; o Swagger UI usa scripts inline
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '1mb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1/public', require('./routes/public.routes'));
app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/users', require('./routes/user.routes'));
app.use('/api/v1/service-orders', require('./routes/serviceOrder.routes'));
app.use('/api/v1/sales', require('./routes/sale.routes'));
app.use('/api/v1/dashboard', require('./routes/dashboard.routes'));
app.use('/api/v1/customers', require('./routes/customer.routes'));
app.use('/api/v1/devices', require('./routes/device.routes'));
app.use('/api/v1/products', require('./routes/product.routes'));
app.use('/api/v1/services', require('./routes/service.routes'));

app.use((req, res) => res.status(404).json({ message: 'Rota não encontrada' }));

const FIELD_LABELS = { email: 'e-mail', barcode: 'código de barras', name: 'nome' };

app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join('; ') });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: `Valor inválido para "${err.path}"` });
   if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    return res.status(409).json({ message: `Já existe um registro com este ${FIELD_LABELS[field] || field || 'valor'}.` });
  }
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3333;
connectDB().then(() =>
  app.listen(PORT, () => console.log(`API em http://localhost:${PORT} | Swagger em http://localhost:${PORT}/api-docs`))
);