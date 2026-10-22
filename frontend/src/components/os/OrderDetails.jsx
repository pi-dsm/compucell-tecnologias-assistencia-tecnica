import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, FileText, RotateCcw, ShieldCheck } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useStatusFlow from '../../hooks/useStatusFlow';
import { brl, dateOnly, dt, DEVICE_TYPES, METHODS, PASSCODE_KINDS, STATUS } from '../../utils/format';
import useHolidayCalendar from '../../hooks/useHolidayCalendar';
import DeadlineField, { deadlinePayload, isDeadlineValid, newDeadline } from '../DeadlineField';
import { btnBlue, btnGhost, btnPrimary, btnSm, Card, Field, Info, inputCls, Modal, PaymentBadge, Spinner, StatusBadge } from '../ui';
import PatternPad from './PatternPad';
import ReceiptModal from './ReceiptModal';
import StatusSelect from './StatusSelect';
import PatternPlayer from './PatternPlayer';
import { paymentLabel } from '../../utils/format';


export default function OrderDetails({ id, onChanged, onOpenOrder }) {
  const toast = useToast();
  const calendar = useHolidayCalendar();

  const { isAdmin } = useAuth();
  const [order, setOrder] = useState(null);
  const [notes, setNotes] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [pay, setPay] = useState({ amount: '', payment_method: 'pix' });
  const [doc, setDoc] = useState(null); // 'receipt' | 'warranty'
  const [returnForm, setReturnForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/service-orders/${id}`);
      setOrder(data);
      setNotes(data.internal_notes || '');
      setPay((p) => ({ ...p, amount: data.balance_due > 0 ? data.balance_due : '' }));
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    load();
    onChanged?.();
  };
  const flow = useStatusFlow(refresh);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const result = await fn();
      if (okMsg) toast.success(okMsg);
      return result;
    } catch (e) {
      toast.error(errMsg(e));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveNotes = async () => {
    await run(() => api.put(`/service-orders/${id}`, { internal_notes: notes }), 'Observações salvas');
    refresh();
  };

  const addPayment = async () => {
    if (!(Number(pay.amount) > 0)) return toast.error('Informe um valor maior que zero');
    const ok = await run(() => api.post(`/service-orders/${id}/payments`, { amount: Number(pay.amount), payment_method: pay.payment_method }), 'Pagamento registrado');
    if (ok) refresh();
  };

  const createReturn = async () => {
    if (!returnForm.reported_issue.trim()) return toast.error('Descreva o defeito apresentado');
    if (!isDeadlineValid(returnForm.budget) || !isDeadlineValid(returnForm.delivery)) return toast.error('Informe as previsões de orçamento e de entrega');
    const res = await run(
      () =>
        api.post(`/service-orders/${id}/return`, {
          reported_issue: returnForm.reported_issue,
          ...deadlinePayload(returnForm.budget, 'budget'),
          ...deadlinePayload(returnForm.delivery, 'delivery'),
        }),
      'Retorno em garantia registrado'
    );
    if (res) {
      setReturnForm(null);
      onChanged?.();
      onOpenOrder?.(res.data.id); // abre a nova OS de garantia
    }
  };

  if (!order) return <Spinner />;

  const { customer, device } = order;
  const passcode = device?.passcode || { kind: 'none' };
  const finished = ['delivered', 'cancelled', 'returned'].includes(order.status);
  const canPay = ['ready', 'delivered'].includes(order.status) && order.balance_due > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-extrabold text-ink-900">OS #{order.service_order_number}</h2>
            {order.is_warranty && <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">GARANTIA</span>}
            <StatusSelect order={order} onChange={flow.request} />
          </div>
          <p className="mt-1 text-xs text-slate-500">Aberta em {dt(order.created_at)} · atualizada em {dt(order.updated_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={`${btnGhost} ${btnSm}`} onClick={() => setDoc('receipt')}><FileText size={14} /> Comprovante</button>
          {order.status === 'delivered' && <button className={`${btnGhost} ${btnSm}`} onClick={() => setDoc('warranty')}><ShieldCheck size={14} /> Termo de garantia</button>}
          {order.status === 'delivered' && order.is_under_warranty && (
            <button
              className={`${btnBlue} ${btnSm}`}
              onClick={() => setReturnForm({ reported_issue: '', budget: newDeadline(1), delivery: newDeadline(3) })}
            >
              <RotateCcw size={14} /> Registrar retorno
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Cliente">
          <div className="grid grid-cols-2 gap-3">
            <Info label="Nome" value={customer?.name} />
            <Info label="Telefone" value={customer?.phone} />
            <Info label="Telefone alternativo" value={customer?.alternative_phone} />
          </div>
        </Card>

        <Card
          title="Aparelho"
          right={
            passcode.kind !== 'none' && (
              <button className="flex items-center gap-1 text-xs font-semibold text-blue-700" onClick={() => setShowPass((v) => !v)}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />} {showPass ? 'Ocultar senha' : 'Mostrar senha'}
              </button>
            )
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Info label="Tipo" value={DEVICE_TYPES[device?.device_type]} />
            <Info label="Marca / modelo" value={`${device?.brand} ${device?.model}`} />
            <Info label="Nº de série / IMEI" value={device?.serial_number} />
            <Info label="Bloqueio" value={PASSCODE_KINDS[passcode.kind]} />
          </div>
          {showPass && passcode.kind === 'pin' && <p className="mt-3 rounded bg-slate-100 px-3 py-2 font-mono text-lg tracking-widest">{passcode.pin}</p>}
          {showPass && passcode.kind === 'written' && <p className="mt-3 rounded bg-slate-100 px-3 py-2 font-mono">{passcode.written}</p>}
          {showPass && passcode.kind === 'pattern' && (
            <div className="mt-3"><PatternPlayer pattern={passcode.pattern || []} /></div>
          )}
        </Card>
      </div>

      <Card title="Atendimento">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3"><Info label="Problema detectado" value={order.reported_issue} /></div>
          <Info label="Previsão de orçamento" value={dateOnly(order.estimated_budget_at)} />
          <Info label="Previsão de entrega" value={dateOnly(order.estimated_delivery_at)} />
          <Info label="Pronta em" value={dt(order.ready_at)} />
          {order.status === 'delivered' && (
            <>
              <Info label="Entregue em" value={dt(order.delivered_at)} />
              <Info label="Garantia" value={order.warranty_days > 0 ? `${order.warranty_days} dias (até ${dateOnly(order.warranty_until)})` : 'Sem garantia adicional'} />
            </>
          )}
        </div>
        {order.origin_order && (
          <p className="mt-3 text-sm">
            Retorno em garantia da{' '}
            <button className="font-semibold text-blue-700 underline" onClick={() => onOpenOrder?.(order.origin_order.id || order.origin_order._id)}>
              OS #{order.origin_order.service_order_number}
            </button>
          </p>
        )}
        {order.warranty_returns?.length > 0 && (
          <p className="mt-3 text-sm">
            Retornos desta OS:{' '}
            {order.warranty_returns.map((r) => (
              <button key={r.id} className="mr-2 font-semibold text-blue-700 underline" onClick={() => onOpenOrder?.(r.id)}>
                OS #{r.service_order_number}
              </button>
            ))}
          </p>
        )}
      </Card>

      <Card title="Peças e valores">
        {order.parts_used.length === 0 ? (
          <p className="text-sm text-slate-500">{order.no_parts_used ? 'Nenhuma peça foi utilizada.' : 'Peças ainda não registradas (informadas ao marcar como pronta).'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr><th className="py-1">Peça</th><th>Fornecedor</th><th>Qtd.</th>{isAdmin && <th>Custo</th>}<th>Venda</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.parts_used.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5">{p.description}{p.warranty_days ? <span className="text-xs text-slate-400"> · gar. {p.warranty_days}d</span> : null}</td>
                    <td>{p.is_own_stock ? 'Próprio' : p.supplier_name}</td>
                    <td>{p.quantity}</td>
                    {isAdmin && <td>{brl(p.cost_price)}</td>}
                    <td>{brl(p.sale_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span>Peças</span><span>{brl(order.parts_total_amount)}</span></div>
          <div className="flex justify-between"><span>Mão de obra</span><span>{brl(order.labor_amount)}</span></div>
          {order.discount_amount > 0 && <div className="flex justify-between text-emerald-700"><span>Desconto</span><span>− {brl(order.discount_amount)}</span></div>}
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold"><span>Total</span><span>{order.is_warranty ? 'Garantia' : brl(order.grand_total_amount)}</span></div>
          {isAdmin && (
            <div className={`flex justify-between text-xs ${order.profit_amount < 0 ? 'font-bold text-red-600' : 'text-slate-500'}`}>
              <span>{order.is_warranty ? 'Prejuízo de garantia' : 'Lucro'}</span>
              <span>{brl(order.is_warranty ? order.warranty_loss_amount : order.profit_amount)}</span>
            </div>
          )}
        </div>
      </Card>

      <Card title="Pagamentos" right={<PaymentBadge state={order.payment_state} />}>
        {order.payments.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum pagamento registrado.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {order.payments.map((p) => (
              <li key={p.id} className="flex justify-between py-1.5">
                <span>{paymentLabel(p)} · {dt(p.paid_at)}{p.payment_status === 'refunded' && ' (estorno)'}</span>                <b>{brl(p.amount)}</b>
              </li>
            ))}
          </ul>
        )}
        {order.balance_due > 0 && <p className="mt-2 text-sm font-semibold text-amber-700">Saldo a receber: {brl(order.balance_due)}</p>}
        {canPay && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select className={`${inputCls} w-auto`} value={pay.payment_method} onChange={(e) => setPay((p) => ({ ...p, payment_method: e.target.value }))}>
              {Object.entries(METHODS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <input className={`${inputCls} w-32`} type="number" min="0" step="0.01" value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} />
            <button className={`${btnPrimary} ${btnSm}`} onClick={addPayment} disabled={busy}>Registrar pagamento</button>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Observações internas">
          <textarea className={inputCls} rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Visível apenas para a equipe." />
          <div className="mt-2 text-right">
            <button className={`${btnGhost} ${btnSm}`} onClick={saveNotes} disabled={busy || notes === (order.internal_notes || '')}>Salvar observações</button>
          </div>
        </Card>
        <Card title="Histórico de status">
          <ol className="space-y-2 border-l-2 border-slate-200 pl-4 text-sm">
            {[...order.status_history].reverse().map((h, i) => (
              <li key={i} className="relative">
                <i className={`absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full ${STATUS[h.status]?.bar}`} />
                <StatusBadge status={h.status} /> <span className="text-xs text-slate-500">{dt(h.changed_at)}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {finished && order.status === 'cancelled' && <p className="text-center text-xs text-slate-400">OS cancelada — somente leitura.</p>}

      {doc && <ReceiptModal orderId={order.id} number={order.service_order_number} kind={doc} onClose={() => setDoc(null)} />}

      {returnForm && (
        <Modal title="Registrar retorno em garantia" onClose={() => setReturnForm(null)} size="sm">
          <p className="mb-3 text-sm text-slate-500">
            A OS #{order.service_order_number} ficará como <b>Retornou</b> e uma nova OS de garantia será aberta (sem cobrança).
          </p>
          <div className="space-y-3">
            <Field label="Defeito apresentado *">
              <textarea className={inputCls} rows={3} value={returnForm.reported_issue} onChange={(e) => setReturnForm((s) => ({ ...s, reported_issue: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <DeadlineField label="Previsão de orçamento" value={returnForm.budget} onChange={(budget) => setReturnForm((s) => ({ ...s, budget }))} calendar={calendar} />
              <DeadlineField label="Previsão de entrega" value={returnForm.delivery} onChange={(delivery) => setReturnForm((s) => ({ ...s, delivery }))} calendar={calendar} />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setReturnForm(null)}>Cancelar</button>
            <button className={btnPrimary} onClick={createReturn} disabled={busy}>Abrir OS de garantia</button>
          </div>
        </Modal>
      )}

      {flow.modals}
    </div>
  );
}