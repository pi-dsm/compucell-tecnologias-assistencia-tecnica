import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Undo2 } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { brl, dt, METHODS } from '../utils/format';
import { btnPrimary, Field, inputCls, Modal, Spinner } from '../components/ui';

const saleStatus = (s) =>
  s.refunded_amount >= s.grand_total_amount && s.grand_total_amount > 0
    ? { label: 'Estornada', cls: 'bg-red-100 text-red-700' }
    : s.refunded_amount > 0
    ? { label: 'Estorno parcial', cls: 'bg-amber-100 text-amber-800' }
    : { label: 'Concluída', cls: 'bg-green-100 text-green-800' };

export default function SalesHistory() {
  const toast = useToast();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get('/sales').then((r) => setSales(r.data)).catch((e) => toast.error(errMsg(e))).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const open = async (id) => {
    try {
      const { data } = await api.get(`/sales/${id}`);
      setSelected(data);
      setRefundAmount('');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const refund = async () => {
    const remaining = selected.grand_total_amount - selected.refunded_amount;
    const label = refundAmount ? brl(refundAmount) : `total (${brl(remaining)})`;
    if (!window.confirm(`Confirmar estorno ${label}?`)) return;
    setBusy(true);
    try {
      const { data } = await api.patch(`/sales/${selected.id}/refund`, refundAmount ? { amount: Number(refundAmount) } : {});
      setSelected(data);
      setRefundAmount('');
      toast.success('Estorno realizado');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-blue-900">Histórico de Vendas</h1>
        <Link to="/vendas/nova" className={btnPrimary}><PlusCircle size={18} /> Nova Venda</Link>
      </div>

      {loading ? (
        <Spinner />
      ) : sales.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm">Nenhuma venda registrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-blue-900 text-xs uppercase text-white">
              <tr><th className="px-4 py-3">Data</th><th>Itens</th><th>Pagamento</th><th>Total</th><th>Lucro</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((s) => {
                const st = saleStatus(s);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{dt(s.created_at)}</td>
                    <td className="max-w-[240px] truncate">{s.products_sold.map((p) => `${p.quantity}x ${p.comercial_name}`).join(', ')}</td>
                    <td>{METHODS[s.payments[0]?.payment_method] || '—'}</td>
                    <td className="font-bold text-blue-900">{brl(s.grand_total_amount)}</td>
                    <td className="text-emerald-700">{brl(s.profit_amount)}</td>
                    <td><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span></td>
                    <td><button onClick={() => open(s.id)} className="font-semibold text-orange-600 hover:underline">Detalhes</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal title="Detalhes da venda" onClose={() => setSelected(null)}>
          <p className="mb-3 text-sm text-slate-500">
            {dt(selected.created_at)} · Vendedor: {selected.created_by?.name || '—'}
          </p>
          <div className="mb-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Item</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {selected.products_sold.map((p, i) => (
                  <tr key={i}><td className="py-2">{p.comercial_name}</td><td>{p.quantity}</td><td>{brl(p.selling_price)}</td><td className="font-semibold">{brl(p.selling_price * p.quantity)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="mb-4 space-y-1 rounded-lg bg-blue-50 p-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{brl(selected.subtotal_amount)}</dd></div>
            <div className="flex justify-between"><dt>Desconto</dt><dd>- {brl(selected.discount_amount)}</dd></div>
            <div className="flex justify-between font-bold text-orange-600"><dt>Total</dt><dd>{brl(selected.grand_total_amount)}</dd></div>
            <div className="flex justify-between"><dt>Lucro líquido</dt><dd>{brl(selected.profit_amount)}</dd></div>
            <div className="flex justify-between text-red-600"><dt>Estornado</dt><dd>{brl(selected.refunded_amount)}</dd></div>
          </dl>
          {selected.grand_total_amount - selected.refunded_amount > 0 && (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Valor do estorno (vazio = total restante)" className="min-w-[200px] flex-1">
                <input type="number" step="0.01" min="0.01" className={inputCls} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
              </Field>
              <button disabled={busy} onClick={refund} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                <Undo2 size={16} /> Estornar
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}