import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Plus, Save, Trash2 } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { brl, dt, METHODS, round2, STATUS, STATUS_FLOW } from '../utils/format';
import { btnBlue, btnGhost, btnPrimary, Card, Field, Info, inputCls, Spinner, StatusBadge } from '../components/ui';

const emptyPart = { part_name: '', cost_price: '', selling_price: '', quantity: 1, supplier_name: '', supplier_info: '' };

export default function ServiceOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [os, setOs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [values, setValues] = useState({ labor: 0, discount: 0 });
  const [part, setPart] = useState(emptyPart);
  const [pay, setPay] = useState({ amount: '', payment_method: 'pix' });

  const apply = (o) => {
    setOs(o);
    setNotes(o.internal_notes || '');
    setValues({ labor: o.labor_total_amount, discount: o.discount_amount });
    setPay((p) => ({ ...p, amount: o.balance_due > 0 ? o.balance_due : '' }));
  };

  useEffect(() => {
    api.get(`/service-orders/${id}`).then((r) => apply(r.data)).catch((e) => toast.error(errMsg(e))).finally(() => setLoading(false));
  }, [id]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const { data } = await fn();
      apply(data);
      if (okMsg) toast.success(okMsg);
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (!os) return <p className="text-center text-slate-500">OS não encontrada.</p>;

  const changeStatus = (s) => run(() => api.patch(`/service-orders/${id}/status`, { status: s }), `Status atualizado: ${STATUS[s].label}`);
  const saveNotes = () => run(() => api.put(`/service-orders/${id}`, { internal_notes: notes }), 'Anotações salvas');
  const saveValues = () => run(() => api.put(`/service-orders/${id}`, { labor_total_amount: Number(values.labor) || 0, discount_amount: Number(values.discount) || 0 }), 'Valores atualizados');

  const addPart = async (e) => {
    e.preventDefault();
    const ok = await run(() => api.patch(`/service-orders/${id}/parts`, {
      part: { ...part, cost_price: Number(part.cost_price) || 0, selling_price: Number(part.selling_price) || 0, quantity: Number(part.quantity) || 1 },
    }), 'Peça adicionada');
    if (ok) setPart(emptyPart);
  };
  const removePart = (pid) => run(() => api.patch(`/service-orders/${id}/parts`, { parts_used: os.parts_used.filter((p) => p.part_id !== pid) }), 'Peça removida');

  const addPayment = async (e) => {
    e.preventDefault();
    await run(() => api.patch(`/service-orders/${id}/payments`, { amount: Number(pay.amount), payment_method: pay.payment_method }), 'Pagamento registrado');
  };

  const cancelOrder = async () => {
    if (!window.confirm('Cancelar esta ordem de serviço?')) return;
    await run(() => api.delete(`/service-orders/${id}`), 'OS cancelada');
  };

  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(os.status) + 1];
  const locked = os.status === 'cancelled';

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <button onClick={() => navigate('/ordens')} className="flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline"><ArrowLeft size={16} /> Voltar</button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-blue-900">OS #{os.service_order_number}</h1>
          <p className="text-sm text-slate-500">Aberta em {dt(os.created_at)} · Atualizada em {dt(os.updated_at)}</p>
        </div>
        <StatusBadge status={os.status} />
      </div>

      <Card title="Ações do técnico">
        {nextStatus && !locked && (
          <button disabled={busy} onClick={() => changeStatus(nextStatus)} className={`${btnPrimary} mb-3 w-full py-3 text-base sm:w-auto`}>
            Avançar para: {STATUS[nextStatus].label}
          </button>
        )}
        <div className="flex flex-wrap gap-2">
          {STATUS_FLOW.filter((s) => s !== os.status).map((s) => (
            <button key={s} disabled={busy || locked} onClick={() => changeStatus(s)} className={btnGhost}>{STATUS[s].label}</button>
          ))}
          {!locked && <button disabled={busy} onClick={cancelOrder} className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><Ban size={16} /> Cancelar OS</button>}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Cliente">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Nome" value={os.customer.customer_name} />
            <Info label="Telefone" value={os.customer.customer_phone} />
            <Info label="Tel. alternativo" value={os.customer.customer_alternative_phone} />
          </div>
        </Card>
        <Card title="Aparelho">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Tipo" value={os.device.device_type} />
            <Info label="Marca / Modelo" value={`${os.device.device_brand} ${os.device.device_model}`} />
            <Info label="Nº série / IMEI" value={os.device.device_serial_number} />
            <Info label="Cor / extras" value={os.device.device_extra_info} />
          </div>
        </Card>
        <Card title="Problema" className="md:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Problema relatado" value={os.reported_issue} />
            <Info label="Estado físico" value={os.physical_condition} />
            <Info label="Senha" value={os.passcode} />
            <Info label="Acessórios deixados" value={os.acessories_left_behind} />
            <Info label="Previsão de entrega" value={os.estimated_delivery_at ? new Date(os.estimated_delivery_at).toLocaleDateString('pt-BR') : ''} />
            <Info label="Pronta em / Entregue em" value={`${dt(os.finished_at)} / ${dt(os.delivered_at)}`} />
          </div>
        </Card>
      </div>

      <Card title="Anotações internas">
        <textarea rows={3} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Diagnóstico, observações técnicas..." />
        <button disabled={busy} onClick={saveNotes} className={`${btnBlue} mt-3`}><Save size={16} /> Salvar anotações</button>
      </Card>

      <Card title="Peças utilizadas">
        {os.parts_used.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr><th className="py-2">Peça</th><th>Fornecedor</th><th>Custo</th><th>Venda</th><th>Qtd</th><th>Total</th><th></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {os.parts_used.map((p) => (
                  <tr key={p.part_id}>
                    <td className="py-2 font-medium">{p.part_name}</td>
                    <td className="text-slate-500">{p.supplier_name || '—'}</td>
                    <td>{brl(p.cost_price)}</td>
                    <td>{brl(p.selling_price)}</td>
                    <td>{p.quantity}</td>
                    <td className="font-semibold">{brl(p.selling_price * p.quantity)}</td>
                    <td><button disabled={busy} onClick={() => removePart(p.part_id)} className="p-1 text-red-500 hover:text-red-700"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form onSubmit={addPart} className="grid gap-3 sm:grid-cols-6">
          <Field label="Peça *" className="sm:col-span-2"><input required className={inputCls} value={part.part_name} onChange={(e) => setPart({ ...part, part_name: e.target.value })} /></Field>
          <Field label="Custo (R$)"><input type="number" step="0.01" min="0" className={inputCls} value={part.cost_price} onChange={(e) => setPart({ ...part, cost_price: e.target.value })} /></Field>
          <Field label="Venda (R$) *"><input required type="number" step="0.01" min="0" className={inputCls} value={part.selling_price} onChange={(e) => setPart({ ...part, selling_price: e.target.value })} /></Field>
          <Field label="Qtd"><input type="number" min="1" className={inputCls} value={part.quantity} onChange={(e) => setPart({ ...part, quantity: e.target.value })} /></Field>
          <Field label="Fornecedor"><input className={inputCls} value={part.supplier_name} onChange={(e) => setPart({ ...part, supplier_name: e.target.value })} /></Field>
          <Field label="Contato do fornecedor" className="sm:col-span-5"><input className={inputCls} value={part.supplier_info} onChange={(e) => setPart({ ...part, supplier_info: e.target.value })} /></Field>
          <div className="flex items-end"><button disabled={busy || locked} className={`${btnBlue} w-full`}><Plus size={16} /> Adicionar</button></div>
        </form>
      </Card>

      <Card title="Valores e pagamentos">
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Field label="Mão de obra (R$)"><input type="number" step="0.01" min="0" className={inputCls} value={values.labor} onChange={(e) => setValues({ ...values, labor: e.target.value })} /></Field>
          <Field label="Desconto (R$)"><input type="number" step="0.01" min="0" className={inputCls} value={values.discount} onChange={(e) => setValues({ ...values, discount: e.target.value })} /></Field>
          <div className="flex items-end"><button disabled={busy || locked} onClick={saveValues} className={`${btnBlue} w-full`}><Save size={16} /> Atualizar valores</button></div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-blue-50 p-4 sm:grid-cols-5">
          <Info label="Peças" value={brl(os.parts_total_amount)} />
          <Info label="Mão de obra" value={brl(os.labor_total_amount)} />
          <Info label="Desconto" value={`- ${brl(os.discount_amount)}`} />
          <div><p className="text-xs font-medium uppercase text-slate-500">Total</p><p className="text-lg font-extrabold text-orange-600">{brl(os.grand_total_amount)}</p></div>
          <Info label="Lucro líquido" value={brl(os.profit_amount)} />
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm">
          <span>Pago: <strong className="text-emerald-600">{brl(os.paid_amount)}</strong></span>
          <span>Restante: <strong className={os.balance_due > 0 ? 'text-red-600' : 'text-emerald-600'}>{os.balance_due > 0 ? brl(os.balance_due) : 'Quitado ✓'}</strong></span>
        </div>

        {os.payments.length > 0 && (
          <ul className="mb-4 divide-y divide-slate-100 text-sm">
            {os.payments.map((p) => (
              <li key={p._id} className="flex justify-between py-2">
                <span>{METHODS[p.payment_method]} · <span className="text-slate-500">{dt(p.paid_at)}</span></span>
                <span className={`font-semibold ${p.payment_status === 'refunded' ? 'text-red-600' : ''}`}>{brl(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}

        {os.balance_due > 0 && !locked && (
          <form onSubmit={addPayment} className="grid gap-3 sm:grid-cols-3">
            <Field label="Valor recebido (R$)"><input required type="number" step="0.01" min="0.01" max={os.balance_due} className={inputCls} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
            <Field label="Forma de pagamento">
              <select className={inputCls} value={pay.payment_method} onChange={(e) => setPay({ ...pay, payment_method: e.target.value })}>
                {Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <div className="flex items-end"><button disabled={busy} className={`${btnPrimary} w-full`}>Registrar pagamento</button></div>
          </form>
        )}
      </Card>
    </div>
  );
}