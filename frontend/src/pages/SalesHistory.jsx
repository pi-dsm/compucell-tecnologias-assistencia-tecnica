import { useCallback, useEffect, useState } from 'react';
import { Undo2 } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { brl, dt, METHODS } from '../utils/format';
import { btnGhost, btnPrimary, btnSm, EmptyState, Field, inputCls, Modal, PageHeader, PaymentBadge, Spinner } from '../components/ui';

const today = () => new Date().toISOString().slice(0, 10);

export default function SalesHistory() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [pay, setPay] = useState({ amount: '', payment_method: 'pix' });
  const [restock, setRestock] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/sales', { params: { from: from || undefined, to: to || undefined, q: q || undefined } });
      setSales(data);
      setSelected((cur) => (cur ? data.find((s) => s.id === cur.id) || cur : cur));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [from, to, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const open = (s) => {
    setSelected(s);
    setPay({ amount: s.balance_due > 0 ? s.balance_due : '', payment_method: 'pix' });
  };

  const act = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const addPayment = () =>
    act(() => api.post(`/sales/${selected.id}/payments`, { amount: Number(pay.amount), payment_method: pay.payment_method }), 'Pagamento registrado');
  const refund = () => {
    if (!window.confirm(`Estornar ${brl(selected.paid_amount)} desta venda?`)) return;
    act(() => api.patch(`/sales/${selected.id}/refund`, { restock }), 'Venda estornada');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader title="Histórico de vendas" subtitle="Consulte vendas, receba saldos pendentes e faça estornos." />

      <div className="flex flex-wrap items-end gap-3">
        <Field label="De"><input type="date" className={inputCls} value={from} max={today()} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Até"><input type="date" className={inputCls} value={to} max={today()} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Nº da venda"><input className={`${inputCls} w-32`} placeholder="Ex.: 12" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
      </div>

      {loading ? (
        <Spinner />
      ) : sales.length === 0 ? (
        <EmptyState>Nenhuma venda encontrada.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{['Nº', 'Data', 'Itens', 'Cliente', 'Total', 'Pagamento', isAdmin && 'Lucro'].filter(Boolean).map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((s) => (
                <tr key={s.id} onClick={() => open(s)} className="cursor-pointer hover:bg-blue-50/40">
                  <td className="px-3 py-2.5 font-bold text-ink-900">#{s.sale_number}</td>
                  <td className="px-3 py-2.5 text-slate-500">{dt(s.created_at)}</td>
                  <td className="max-w-64 truncate px-3 py-2.5">{s.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</td>
                  <td className="px-3 py-2.5">{s.customer?.name || '—'}</td>
                  <td className="px-3 py-2.5 font-semibold">{brl(s.grand_total_amount)}</td>
                  <td className="px-3 py-2.5"><PaymentBadge state={s.payment_state} /></td>
                  {isAdmin && <td className="px-3 py-2.5 text-slate-500">{brl(s.profit_amount)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal title={`Venda #${selected.sale_number}`} onClose={() => setSelected(null)}>
          <p className="mb-3 text-sm text-slate-500">{dt(selected.created_at)} · {selected.created_by?.name} {selected.customer && `· ${selected.customer.name}`}</p>
          <ul className="divide-y divide-slate-100 text-sm">
            {selected.items.map((i, idx) => (
              <li key={idx} className="flex justify-between py-1.5"><span>{i.quantity}× {i.name}</span><b>{brl(i.unit_price * i.quantity)}</b></li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
            {selected.discount_amount > 0 && <div className="flex justify-between text-emerald-700"><span>Desconto</span><span>− {brl(selected.discount_amount)}</span></div>}
            <div className="flex justify-between text-base font-bold"><span>Total</span><span>{brl(selected.grand_total_amount)}</span></div>
          </div>

          <h4 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Pagamentos</h4>
          <ul className="text-sm">
            {selected.payments.map((p) => (
              <li key={p.id} className="flex justify-between py-1">
                <span>{METHODS[p.payment_method]} · {dt(p.paid_at)}{p.payment_status === 'refunded' && ' (estorno)'}</span><b>{brl(p.amount)}</b>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex items-center justify-between"><PaymentBadge state={selected.payment_state} />{selected.balance_due > 0 && <b className="text-amber-700">A receber: {brl(selected.balance_due)}</b>}</div>

          {selected.balance_due > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select className={`${inputCls} w-auto`} value={pay.payment_method} onChange={(e) => setPay((p) => ({ ...p, payment_method: e.target.value }))}>
                {Object.entries(METHODS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <input className={`${inputCls} w-28`} type="number" min="0" step="0.01" value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} />
              <button className={`${btnPrimary} ${btnSm}`} onClick={addPayment} disabled={busy || !(Number(pay.amount) > 0)}>Receber</button>
            </div>
          )}

          {isAdmin && selected.paid_amount > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Devolver produtos ao estoque (estorno total)</label>
              <button className={`${btnGhost} ${btnSm} text-red-600`} onClick={refund} disabled={busy}><Undo2 size={14} /> Estornar venda</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}