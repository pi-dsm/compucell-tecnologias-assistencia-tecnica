require('dotenv').config();
const mongoose = require('mongoose');
const argon2 = require('argon2');
const User = require('./models/User');
const Customer = require('./models/Customer');
const Device = require('./models/Device');
const Product = require('./models/Product');
const StockMovement = require('./models/StockMovement');
const Service = require('./models/Service');
const ServiceOrder = require('./models/ServiceOrder');
const Sale = require('./models/Sale');
const Setting = require('./models/Setting');
const Supplier = require('./models/Supplier');
const { Counter } = require('./models/Counter');
const { createSale } = require('./services/sale.service');

const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysAhead = (n) => daysAgo(-n);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all(
    [User, Customer, Device, Product, StockMovement, Service, ServiceOrder, Sale, Setting, Counter, Supplier].map((m) => m.deleteMany())
  );

  // ── Usuários ──────────────────────────────────────────────
  const admin = await User.create({ name: 'Administrador', email: 'admin@email.com', password: await argon2.hash('admin123'), phone: '(14) 99999-0000', role: 'admin' });

  // ── Clientes e aparelhos ──────────────────────────────────
  const [joao, maria, carlos, paula] = await Customer.create([
    { name: 'João Silva', phone: '(14) 99811-2233', alternative_phone: '(14) 99622-0000'},
    { name: 'Maria Souza', phone: '(14) 99755-4411', alternative_phone: '(14) 99598-0000' },
    { name: 'Carlos Lima', phone: '(14) 99630-7788', alternative_phone: '(14) 99630-0000' },
    { name: 'Paula Ribeiro', phone: '(14) 99122-3344', alternative_phone: '(14) 99122-0000' },
  ]);
  const [iphone, galaxy, dell, moto, ipad] = await Device.create([
    { customer: joao._id, device_type: 'phone', brand: 'Apple', model: 'iPhone 11', passcode: { kind: 'pin', pin: '1234' } },
    { customer: maria._id, device_type: 'phone', brand: 'Samsung', model: 'Galaxy A54', passcode: { kind: 'pattern', pattern: [0, 1, 2, 5, 8] } },
    { customer: carlos._id, device_type: 'laptop', brand: 'Dell', model: 'Inspiron 15', passcode: { kind: 'written', written: 'Dell@2024' } },
    { customer: paula._id, device_type: 'phone', brand: 'Motorola', model: 'Moto G84' },
    { customer: joao._id, device_type: 'tablet', brand: 'Apple', model: 'iPad 9', passcode: { kind: 'none' } },
  ]);

  // ── Fornecedores ──────────────────────────────────────────
  const [tecpecas, infoparts] = await Supplier.create([
    { name: 'TecPeças Distribuidora', document: '11.222.333/0001-81', contact_name: 'Marcos', phone: '(11) 4002-8922', city: 'São Paulo', state: 'SP' },
    { name: 'InfoParts Componentes', document: '45.678.912/0001-55', contact_name: 'Renata', phone: '(14) 3622-1100', city: 'Bauru', state: 'SP' },
  ]);

  // ── Catálogo ──────────────────────────────────────────────
  const [pelicula, carregador, cabo, caderno, teclado, lampada] = await Product.create([
    { name: 'Película 3D iPhone 13', barcode: '7891000000011', category: 'screen_protector', supplier: tecpecas._id, cost_price: 5, sale_price: 25, stock_quantity: 20, min_stock: 5 },
    { name: 'Carregador USB-C 20W', barcode: '7891000000028', category: 'accessory', supplier: infoparts._id, cost_price: 22, sale_price: 59.9, stock_quantity: 8, min_stock: 3 },
    { name: 'Cabo Lightning 1m', barcode: '7891000000035', category: 'accessory', supplier: infoparts._id, cost_price: 9, sale_price: 29.9, stock_quantity: 12, min_stock: 4 },
    { name: 'Caderno 96 folhas', barcode: '7891000000042', category: 'stationery', supplier: tecpecas._id, cost_price: 8, sale_price: 18, stock_quantity: 15, min_stock: 5 },
    { name: 'Teclado USB ABNT2', barcode: '7891000000059', category: 'keyboard', cost_price: 35, sale_price: 79.9, stock_quantity: 2, min_stock: 3 },
    { name: 'Lâmpada LED 9W', barcode: '7891000000066', category: 'lighting', cost_price: 4, sale_price: 12, stock_quantity: 30, min_stock: 10 },
  ]);
  const [xerox, impressao, formatacao] = await Service.create([
    { name: 'Xerox (cópia)', price: 0.5, cost_price: 0.1 },
    { name: 'Impressão colorida', price: 2, cost_price: 0.6 },
    { name: 'Formatação de computador', price: 120, cost_price: 0 },
  ]);

  // ── Ordens de serviço ─────────────────────────────────────
  async function makeOrder(o) {
    const order = new ServiceOrder({
      customer: o.customer._id,
      device: o.device._id,
      reported_issue: o.issue,
      estimated_budget_at: daysAhead(o.budgetIn ?? 1),
      estimated_delivery_at: daysAhead(o.deliveryIn ?? 3),
      status: o.status,
      status_history: [{ status: 'received', changed_by: admin._id, changed_at: o.created }, ...(o.status !== 'received' ? [{ status: o.status, changed_by: admin._id, changed_at: o.updated || o.created }] : [])],
      parts_used: o.parts || [],
      no_parts_used: !!o.noParts,
      labor_amount: o.labor || 0,
      discount_amount: o.discount || 0,
      payments: o.payments || [],
      ready_at: o.ready_at,
      delivered_at: o.delivered_at,
      warranty_days: o.warranty_days,
      warranty_until: o.warranty_until,
      origin_order: o.origin_order,
      is_warranty: !!o.is_warranty,
      internal_notes: o.notes,
      created_by: admin._id,
      updated_by: admin._id,
    });
    await order.save();
    await ServiceOrder.updateOne({ _id: order._id }, { created_at: o.created, updated_at: o.updated || o.created }, { timestamps: false });
    return order;
  }

  const screenPart = { part_name: 'Tela Galaxy A54', supplier: tecpecas._id, supplier_name: tecpecas.name, supplier_contact: 'Marcos · (11) 4002-8922', purchase_reference: 'NF-8812', cost_price: 150, sale_price: 280, quantity: 1, warranty_days: 90 };

  await makeOrder({ customer: joao, device: iphone, issue: 'Tela não responde ao toque', status: 'received', created: daysAgo(5), deliveryIn: 2 });
  await makeOrder({ customer: maria, device: galaxy, issue: 'Bateria descarrega muito rápido', status: 'in_diagnosis', created: daysAgo(2), updated: daysAgo(1) });
  await makeOrder({ customer: carlos, device: dell, issue: 'Não liga', status: 'in_repair', created: daysAgo(3), updated: daysAgo(0.5) });
  await makeOrder({
    customer: paula, device: moto, issue: 'Não carrega', status: 'ready', created: daysAgo(6), updated: daysAgo(4), ready_at: daysAgo(4),
    parts: [{ part_name: 'Conector de carga Moto G84', is_own_stock: true, sale_price: 70, quantity: 1 }], labor: 50,
  });

  // OS entregue que voltou em garantia (gera prejuízo)
  const original = await makeOrder({
    customer: maria, device: galaxy, issue: 'Tela trincada', status: 'returned', created: daysAgo(14), updated: daysAgo(3),
    parts: [screenPart], labor: 60, delivered_at: daysAgo(10), warranty_days: 90, warranty_until: daysAhead(80),
    payments: [{ amount: 340, payment_method: 'pix', paid_at: daysAgo(10) }],
  });
  await makeOrder({
    customer: maria, device: galaxy, issue: 'Tela voltou a falhar (retorno)', status: 'delivered', created: daysAgo(3), updated: daysAgo(2),
    is_warranty: true, origin_order: original._id, delivered_at: daysAgo(2), warranty_days: 30, warranty_until: daysAhead(28),
    parts: [{ part_name: 'Flat da tela', supplier: infoparts._id, purchase_reference: 'NF-9001', cost_price: 35, sale_price: 0, quantity: 1 }],
    notes: `Retorno em garantia da OS #${original.service_order_number}.`,
  });
  await makeOrder({
    customer: carlos, device: dell, issue: 'Troca de fonte', status: 'delivered', created: daysAgo(5), updated: daysAgo(1),
    parts: [{ part_name: 'Fonte 65W', supplier: infoparts._id, purchase_reference: 'NF-7733', cost_price: 90, sale_price: 180, quantity: 1 }],
    labor: 40, delivered_at: daysAgo(1), warranty_days: 90, warranty_until: daysAhead(89),
    payments: [{ amount: 120, payment_method: 'cash', paid_at: daysAgo(1) }], // saldo pendente de R$ 100,00
  });
  await makeOrder({ customer: joao, device: ipad, issue: 'Limpeza e troca de pasta térmica', status: 'cancelled', created: daysAgo(9), updated: daysAgo(8) });

  // ── Vendas (via serviço: exercita estoque e regras) ───────
  const sales = [
    { at: 0, body: { items: [{ item_type: 'product', product_id: pelicula._id, quantity: 2 }], payments: [{ amount: 50, payment_method: 'pix' }] } },
    { at: 1, body: { items: [{ item_type: 'service', service_id: xerox._id, quantity: 40 }, { item_type: 'product', product_id: caderno._id, quantity: 1 }], discount_amount: 2, payments: [{ amount: 36, payment_method: 'cash' }] } },
    { at: 3, body: { items: [{ item_type: 'product', product_id: carregador._id, quantity: 1 }, { item_type: 'product', product_id: cabo._id, quantity: 1 }], discount_amount: 5, payments: [{ amount: 84.8, payment_method: 'credit_card' }] } },
    { at: 4, body: { items: [{ item_type: 'service', service_id: formatacao._id, quantity: 1 }], customer_id: carlos._id, payments: [{ amount: 60, payment_method: 'pix' }], allow_partial: true } },
  ];
  for (const s of sales) {
    const sale = await createSale(s.body, admin);
    const at = daysAgo(s.at);
    await Sale.updateOne({ _id: sale._id }, { $set: { created_at: at, 'payments.$[].paid_at': at } }, { timestamps: false });
  }

  await Setting.create({ key: 'goals', value: { daily: 400, weekly: 2500, monthly: 10000 } });

  console.log('Seed concluído.');
  console.log('Logins: admin@email.com / admin123');
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});