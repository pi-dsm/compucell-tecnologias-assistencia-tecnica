import { useState } from 'react';
import api, { errMsg } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { brl, round2 } from '../../utils/format';
import { btnGhost, btnPrimary, Field, inputCls, Modal } from '../ui';
import PaymentsEditor, { emptyPayment, paymentsPayload, sumPayments } from '../PaymentsEditor';

export default function DeliverModal({ order, onClose, onSaved }) {
  const toast = useToast();
  const gross = round2((order.parts_total_amount || 0) + (order.labor_amount || 0));
  const [discount, setDiscount] = useState(order.discount_amount || '');
  const disc = Math.min(Number(discount) || 0, gross);
  const total = order.is_warranty ? 0 : round2(gross - disc);
  const alreadyPaid = order.paid_amount || 0;
  const due = round2(Math.max(0, total - alreadyPaid));

  const [payments, setPayments] = useState(() => (due > 0 ? [emptyPayment(due)] : []));
  const [allowPartial, setAllowPartial] = useState(false);
  const [warrantyDays, setWarrantyDays] = useState('');
  const [saving, setSaving] = useState(false);

  const remaining = round2(due - sumPayments(payments));

  const submit = async () => {
    if (remaining < 0) return toast.error('O pagamento informado excede o total da OS');
    if (remaining > 0 && !allowPartial) return toast.error(`Falta receber ${brl(remaining)}. Registre o pagamento ou confirme a entrega com saldo pendente.`);
    setSaving(true);
    try {
      const { data } = await api.patch(`/service-orders/${order.id}/deliver`, {
        discount_amount: disc,
        payments: paymentsPayload(payments),
        allow_partial: allowPartial,
        warranty_days: warrantyDays === '' ? undefined : Number(warrantyDays),
      });
      toast.success(`OS #${data.service_order_number} entregue`);
      onSaved(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Entrega e pagamento — OS #${order.service_order_number}`} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-500">{order.device?.brand} {order.device?.model} · {order.customer?.name}</p>

      <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <div className="flex justify-between"><span>Peças</span><b>{brl(order.parts_total_amount)}</b></div>
        <div className="flex justify-between"><span>Mão de obra</span><b>{brl(order.labor_amount)}</b></div>
        {disc > 0 && <div className="flex justify-between text-emerald-700"><span>Desconto</span><b>− {brl(disc)}</b></div>}
        <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-base">
          <span>Total</span><b>{order.is_warranty ? 'Garantia (sem cobrança)' : brl(total)}</b>
        </div>
        {alreadyPaid > 0 && <div className="flex justify-between text-slate-500"><span>Já pago</span><span>{brl(alreadyPaid)}</span></div>}
      </div>

      {!order.is_warranty && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Desconto (R$)">
            <input className={inputCls} type="number" min="0" step="0.01" max={gross} value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </Field>
          <Field label="Garantia do serviço (dias)" hint="Vazio = prazo padrão da empresa.">
            <input className={inputCls} type="number" min="0" value={warrantyDays} onChange={(e) => setWarrantyDays(e.target.value)} />
          </Field>
        </div>
      )}

      {due > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Pagamento recebido agora</p>
          <PaymentsEditor value={payments} onChange={setPayments} due={due} />
          {remaining > 0 && (
            <label className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
              <input className="mt-0.5" type="checkbox" checked={allowPartial} onChange={(e) => setAllowPartial(e.target.checked)} />
              Entregar o aparelho com saldo pendente de <b>{brl(remaining)}</b> (o valor fica registrado como a receber).
            </label>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button className={btnGhost} onClick={onClose}>Cancelar</button>
        <button className={btnPrimary} onClick={submit} disabled={saving}>{saving ? 'Salvando…' : 'Confirmar entrega'}</button>
      </div>
    </Modal>
  );
}