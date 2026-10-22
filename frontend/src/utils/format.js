export const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
export const dt = (d) => (d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const dateOnly = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
export const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

// Datas de formulário: <input type="date"> usa 'YYYY-MM-DD'. Enviamos ao meio-dia local para
// evitar o "dia anterior" causado pela conversão UTC.
export const dateInputToISO = (v) => (v ? new Date(`${v}T12:00:00`).toISOString() : undefined);
export const isoToDateInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const todayPlus = (days) => isoToDateInput(new Date(Date.now() + days * 86400000).toISOString());

export const timeAgo = (d) => {
  if (!d) return '—';
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days > 1 ? 's' : ''}`;
};

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};
export const todayLong = () => {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const OPEN_STATUSES = ['received', 'in_diagnosis', 'in_repair', 'ready'];
export const CLOSED_STATUSES = ['delivered', 'cancelled', 'returned'];

export const STATUS = {
  received: { label: 'Recebido', cls: 'bg-slate-100 text-slate-700 ring-slate-200', bar: 'bg-slate-400' },
  in_diagnosis: { label: 'Em análise', cls: 'bg-amber-50 text-amber-800 ring-amber-200', bar: 'bg-amber-400' },
  in_repair: { label: 'Em conserto', cls: 'bg-blue-50 text-blue-800 ring-blue-200', bar: 'bg-blue-500' },
  ready: { label: 'Pronto p/ retirada', cls: 'bg-green-50 text-green-800 ring-green-200', bar: 'bg-green-500' },
  delivered: { label: 'Entregue', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', bar: 'bg-emerald-600' },
  cancelled: { label: 'Cancelada', cls: 'bg-red-50 text-red-700 ring-red-200', bar: 'bg-red-500' },
  returned: { label: 'Retornou (garantia)', cls: 'bg-violet-50 text-violet-800 ring-violet-200', bar: 'bg-violet-500' },
};
export const STATUS_FLOW = ['received', 'in_diagnosis', 'in_repair', 'ready', 'delivered'];

export const METHODS = { pix: 'Pix', cash: 'Dinheiro', credit_card: 'Cartão de crédito', debit_card: 'Cartão de débito' };
export const ROLES = { admin: 'Administrador', technician: 'Técnico', attendant: 'Atendente' };
export const PAYMENT_STATE = {
  paid: { label: 'Pago', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  partial: { label: 'Pagamento parcial', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  unpaid: { label: 'Não pago', cls: 'bg-red-50 text-red-700 ring-red-200' },
};

export const DEVICE_TYPES = {
  phone: 'Celular', tablet: 'Tablet', laptop: 'Notebook', desktop: 'Computador',
  console: 'Console', smartwatch: 'Smartwatch', tv: 'TV', other: 'Outro',
};
export const PASSCODE_KINDS = { none: 'Sem senha', pin: 'PIN', written: 'Senha escrita', pattern: 'Padrão' };
export const PRODUCT_CATEGORIES = {
  accessory: 'Acessórios', stationery: 'Papelaria', keyboard: 'Teclados',
  screen_protector: 'Películas', lighting: 'Iluminação', other: 'Outros',
};
export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Ordem de entrega prevista já passou e a OS ainda está aberta?
export const isOverdue = (order) =>
  OPEN_STATUSES.includes(order.status) && order.estimated_delivery_at && new Date(order.estimated_delivery_at) < new Date(new Date().toDateString());

export const BR_STATES = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

export const formatDocument = (v) => {
  const d = onlyDigits(v);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return v || '';
};

export const formatPhone = (v) => {
  const d = onlyDigits(v);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return v || '';
};

export const paymentLabel = (p) =>
  `${METHODS[p.payment_method] || p.payment_method}${p.payment_method === 'credit_card' && p.installments > 1 ? ` ${p.installments}x` : ''}`;