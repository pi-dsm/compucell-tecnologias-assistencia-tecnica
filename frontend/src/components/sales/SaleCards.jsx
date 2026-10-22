import { useState } from 'react';
import { ChevronDown, Undo2 } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { brl, dt, friendlyDateTime, METHODS, paymentLabel, salePaymentSummary, saleStatus } from '../../utils/format';
import { btnGhost, btnPrimary, btnSm, inputCls } from '../ui';

export default function SaleCard({ sale, expanded, onToggle, onChanged }) {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [pay, setPay] = useState({ amount: sale.balance_due > 0 ? sale.balance_due : '', payment_method: 'pix' });
  const [restock, setRestock] = useState(true);
  const [busy, setBusy] = useState(false);

  const status = saleStatus(sale);
  const itemsCount = sale.items.reduce((s, i) => s + i.quantity, 0);

  const act = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      onChanged();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const receive = () => act(() => api.post(`/sales/${sale.id}/payments`, { amount: Number(pay.amount), payment_method: pay.payment_method }), 'Pagamento registrado');
  const refund = () => {
    if (!window.confirm(`Estornar ${brl(sale.paid_amount)} desta venda?`)) return;
    act(() => api.patch(`/sales/${sale.id}/refund`, { restock }), 'Venda estornada');
  };

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 p-4 text-left hover:bg-slate-50">
        <div className="min-w-28">
          <p className="text-lg font-extrabold text-ink-900">#{sale.sale_number}</p>
          <p className="font-mono text-xs text-slate-400">{sale.short_id}</p>
        </div>
        <div className="min-w-40 flex-1">
          <p className="font-semibold text-slate-800">{friendlyDateTime(sale.created_at)}</p>
          <p className="text-sm text-slate-500">{itemsCount} {itemsCount === 1 ? 'item' : 'itens'} · {salePaymentSummary(sale)}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${status.cls}`}>{status.label}</span>
        <div className="ml-auto text-right">
          <p className="text-xl font-extrabold text-ink-900">{brl(sale.grand_total_amount)}</p>
          {isAdmin && <p className="text-sm font-bold text-emerald-700">Lucro bruto {brl(sale.gross_profit_amount)}</p>}
        </div>
        <ChevronDown className={`shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} size={22} />
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-slate-100 bg-slate-50/50 p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr><th className="py-1">Item</th><th>Tipo</th><th className="text-right">Qtd.</th><th className="text-right">Valor un.</th><th className="text-right">Subtotal</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((i, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5 font-medium">{i.name}</td>
                    <td>{i.item_type === 'product' ? 'Produto' : 'Serviço'}</td>
                    <td className="text-right">{i.quantity}</td>
                    <td className="text-right">{brl(i.unit_price)}</td>
                    <td className="text-right font-semibold">{brl(i.unit_price * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200">
              <div className="flex justify-between"><span>Subtotal</span><span>{brl(sale.subtotal_amount)}</span></div>
              {sale.discount_amount > 0 && <div className="flex justify-between text-emerald-700"><span>Desconto aplicado</span><span>− {brl(sale.discount_amount)}</span></div>}
              <div className="flex justify-between border-t border-slate-100 pt-1 font-bold"><span>Total</span><span>{brl(sale.grand_total_amount)}</span></div>
              {isAdmin && (
                <>
                  <div className="flex justify-between text-slate-500"><span>Custo total das peças/itens</span><span>{brl(sale.cost_total_amount)}</span></div>
                  <div className="flex justify-between font-bold text-emerald-700"><span>Lucro líquido final</span><span>{brl(sale.profit_amount)}</span></div>
                </>
              )}
            </div>
            <div className="space-y-1 rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200">
              <p><span className="text-slate-500">Atendente:</span> <b>{sale.created_by?.name || '—'}</b></p>
              {sale.customer && <p><span className="text-slate-500">Cliente:</span> <b>{sale.customer.name}</b></p>}
              <p><span className="text-slate-500">Observações:</span> {sale.notes || '—'}</p>
              <ul className="border-t border-slate-100 pt-1 text-xs text-slate-500">
                {sale.payments.map((p) => (
                  <li key={p.id} className="flex justify-between"><span>{paymentLabel(p)} · {dt(p.paid_at)}{p.payment_status === 'refunded' && ' (estorno)'}</span><b>{brl(p.amount)}</b></li>
                ))}
              </ul>
            </div>
          </div>

          {sale.balance_due > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
              <b className="text-sm text-amber-900">A receber: {brl(sale.balance_due)}</b>
              <select className={`${inputCls} w-auto`} value={pay.payment_method} onChange={(e) => setPay((p) => ({ ...p, payment_method: e.target.value }))}>
                {Object.entries(METHODS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <input className={`${inputCls} w-28`} type="number" min="0" step="0.01" value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} />
              <button className={`${btnPrimary} ${btnSm}`} onClick={receive} disabled={busy || !(Number(pay.amount) > 0)}>Receber</button>
            </div>
          )}

          {isAdmin && sale.paid_amount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Devolver produtos ao estoque (estorno total)</label>
              <button className={`${btnGhost} ${btnSm} text-red-600`} onClick={refund} disabled={busy}><Undo2 size={14} /> Estornar venda</button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}