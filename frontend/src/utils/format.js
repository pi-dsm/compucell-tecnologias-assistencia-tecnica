export const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
export const dt = (d) => (d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const STATUS = {
  received: { label: 'Recebido', cls: 'bg-slate-100 text-slate-700' },
  in_diagnosis: { label: 'Em análise', cls: 'bg-amber-100 text-amber-800' },
  in_repair: { label: 'Em conserto', cls: 'bg-blue-100 text-blue-800' },
  ready: { label: 'Pronto p/ retirada', cls: 'bg-green-100 text-green-800' },
  delivered: { label: 'Entregue', cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelada', cls: 'bg-red-100 text-red-700' },
};
export const STATUS_FLOW = ['received', 'in_diagnosis', 'in_repair', 'ready', 'delivered'];
export const METHODS = { pix: 'Pix', cash: 'Dinheiro', credit_card: 'Cartão de crédito', debit_card: 'Cartão de débito' };
export const ROLES = { admin: 'Administrador', technician: 'Técnico', attendant: 'Atendente' };