require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/db');
const swaggerSpec = require('./config/swagger');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1/public', require('./routes/public.routes'));
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/users', require('./routes/user.routes'));
app.use('/api/v1/service-orders', require('./routes/serviceOrder.routes'));
app.use('/api/v1/sales', require('./routes/sale.routes'));
app.use('/api/v1/dashboard', require('./routes/dashboard.routes'));

app.use((req, res) => res.status(404).json({ message: 'Rota não encontrada' }));

app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join('; ') });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: `Valor inválido para "${err.path}"` });
  if (err.code === 11000) return res.status(409).json({ message: 'Registro duplicado (e-mail já cadastrado?)' });
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3333;
connectDB().then(() =>
  app.listen(PORT, () => console.log(`API em http://localhost:${PORT} | Swagger em http://localhost:${PORT}/api-docs`))
);