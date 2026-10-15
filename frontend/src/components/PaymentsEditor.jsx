import { Plus, Trash2 } from 'lucide-react';
import { brl, METHODS, round2 } from '../utils/format';
import { btnGhost, btnSm, inputCls } from './ui';

export const emptyPayment = (amount = '') => ({
  key: Math.random().toString(36).slice(2),
  payment_method: 'pix',
  amount,
});
export const sumPayments = (list) => round2(list.reduce((s, p) => s + (Number(p.amount) || 0), 0));
export const paymentsPayload = (list) =>
  list.filter((p) => Number(p.amount) > 0).map((p) => ({ amount: Number(p.amount), payment_method: p.payment_method }));

// due = valor a receber agora. Mostra o que ainda falta.
export default function PaymentsEditor({ value, onChange, due }) {
  const remaining = round2(due - sumPayments(value));
  const update = (key, patch) => onChange(value.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-2">
      {value.map((p) => (
        <div key={p.key} className="flex flex-wrap items-center gap-2">
          <select className={`${inputCls} w-auto`} value={p.payment_method} onChange={(e) => update(p.key, { payment_method: e.target.value })}>
            {Object.entries(METHODS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <input
            className={`${inputCls} w-32`}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="Valor"
            value={p.amount}
            onChange={(e) => update(p.key, { amount: e.target.value })}
          />
          {remaining > 0 && (
            <button type="button" className={`${btnGhost} ${btnSm}`} onClick={() => update(p.key, { amount: round2((Number(p.amount) || 0) + remaining) })}>
              Restante
            </button>
          )}
          <button type="button" className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remover pagamento" onClick={() => onChange(value.filter((x) => x.key !== p.key))}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button type="button" className={`${btnGhost} ${btnSm}`} onClick={() => onChange([...value, emptyPayment()])}>
        <Plus size={14} /> Forma de pagamento
      </button>
      <p className={`text-sm font-semibold ${remaining > 0 ? 'text-amber-700' : remaining < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
        {remaining > 0 && `Falta receber ${brl(remaining)}`}
        {remaining < 0 && `Pagamento excede o total em ${brl(-remaining)}`}
        {remaining === 0 && 'Pagamento completo'}
      </p>
    </div>
  );
}