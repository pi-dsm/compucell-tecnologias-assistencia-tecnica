const ServiceOrder = require('../models/ServiceOrder');
const { asyncHandler } = require('../utils/helpers');

// Retorna apenas dados não sensíveis (sem senha, valores ou dados do cliente)
exports.track = asyncHandler(async (req, res) => {
  const n = Number(req.params.number);
  if (!Number.isInteger(n)) return res.status(400).json({ message: 'Número de OS inválido' });
  const os = await ServiceOrder.findOne({ service_order_number: n });
  if (!os) return res.status(404).json({ message: 'Ordem de serviço não encontrada' });
  res.json({
    service_order_number: os.service_order_number,
    status: os.status,
    device: `${os.device.device_brand} ${os.device.device_model}`,
    received_at: os.created_at,
    estimated_delivery_at: os.estimated_delivery_at || null,
    finished_at: os.finished_at || null,
    delivered_at: os.delivered_at || null,
  });
});