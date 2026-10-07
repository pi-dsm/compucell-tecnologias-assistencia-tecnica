require('dotenv').config();
const mongoose = require('mongoose');
const argon2 = require('argon2');
const User = require('./models/User');
const ServiceOrder = require('./models/ServiceOrder');
const Sale = require('./models/Sale');

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([User.deleteMany(), ServiceOrder.deleteMany(), Sale.deleteMany(), mongoose.connection.collection('counters').deleteMany({})]);

  const admin = await User.create({ name: 'Administrador', email: 'admin@email.com', password: await argon2.hash('admin123'), phone: '(14) 99999-0000', role: 'admin' });
  await User.create({ name: 'Técnico Carlos', email: 'tecnico@email.com', password: await argon2.hash('tecnico123'), phone: '(14) 99999-1111', role: 'technician' });

  const base = { created_by: admin._id, updated_by: admin._id };
  const orders = [
    {
      customer: { customer_name: 'João Silva', customer_phone: '(14) 99811-2233' },
      device: { device_type: 'Celular', device_brand: 'Apple', device_model: 'iPhone 11', device_serial_number: '356789012345678', device_extra_info: 'Cor: Preto' },
      reported_issue: 'Tela não responde ao toque', physical_condition: 'Arranhões leves na traseira',
      passcode: '1234', acessories_left_behind: 'Capinha', status: 'in_diagnosis', estimated_delivery_at: daysAgo(-3),
    },
    {
      customer: { customer_name: 'Maria Souza', customer_phone: '(14) 99755-4411', customer_alternative_phone: '(14) 3622-0000' },
      device: { device_type: 'Celular', device_brand: 'Samsung', device_model: 'Galaxy A54', device_serial_number: '351234567890123', device_extra_info: 'Cor: Azul' },
      reported_issue: 'Bateria descarrega muito rápido', physical_condition: 'Sem avarias',
      status: 'in_repair', labor_total_amount: 80, estimated_delivery_at: daysAgo(-1),
      parts_used: [{ part_name: 'Bateria Galaxy A54', cost_price: 60, selling_price: 120, quantity: 1, supplier_name: 'TecPeças', supplier_info: '(11) 4002-8922' }],
      payments: [{ amount: 100, payment_method: 'pix', payment_status: 'paid', paid_at: daysAgo(1) }],
    },
    {
      customer: { customer_name: 'Carlos Lima', customer_phone: '(14) 99630-7788' },
      device: { device_type: 'Notebook', device_brand: 'Dell', device_model: 'Inspiron 15', device_serial_number: 'DL15-88231', device_extra_info: 'Cor: Prata' },
      reported_issue: 'Não liga', physical_condition: 'Carcaça com marcas de uso',
      acessories_left_behind: 'Carregador', status: 'ready', labor_total_amount: 120, discount_amount: 10, finished_at: daysAgo(0),
      parts_used: [{ part_name: 'Fonte 65W', cost_price: 90, selling_price: 180, quantity: 1, supplier_name: 'InfoParts' }],
      payments: [{ amount: 150, payment_method: 'cash', payment_status: 'paid', paid_at: daysAgo(2) }],
    },
  ];
  for (const o of orders) {
    const doc = new ServiceOrder({ ...o, ...base, service_order_number: await ServiceOrder.nextNumber() });
    await doc.save();
  }

  const sales = [
    { items: [{ comercial_name: 'Película iPhone 13', category: 'Acessórios', cost_price: 5, selling_price: 25, quantity: 2 }], discount: 0, method: 'pix', at: daysAgo(0) },
    { items: [{ comercial_name: 'Xerox', category: 'Papelaria', cost_price: 0.1, selling_price: 0.5, quantity: 40 }, { comercial_name: 'Caderno 96 folhas', category: 'Papelaria', cost_price: 8, selling_price: 18, quantity: 1 }], discount: 2, method: 'cash', at: daysAgo(1) },
    { items: [{ comercial_name: 'Carregador USB-C 20W', category: 'Acessórios', cost_price: 22, selling_price: 59.9, quantity: 1 }, { comercial_name: 'Cabo Lightning 1m', category: 'Acessórios', cost_price: 9, selling_price: 29.9, quantity: 1 }], discount: 5, method: 'credit_card', at: daysAgo(3) },
  ];
  for (const s of sales) {
    const sale = new Sale({ products_sold: s.items, discount_amount: s.discount, created_by: admin._id });
    sale.recalculate();
    sale.payments.push({ amount: sale.grand_total_amount, payment_method: s.method, payment_status: 'paid', paid_at: s.at });
    await sale.save();
    await Sale.updateOne({ _id: sale._id }, { created_at: s.at });
  }

  console.log('Seed concluído. Login: admin@email.com / admin123');
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});