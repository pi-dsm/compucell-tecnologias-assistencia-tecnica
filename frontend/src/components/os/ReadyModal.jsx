import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { brl, round2 } from '../../utils/format';
import { btnGhost, btnPrimary, Field, inputCls, Modal } from '../ui';

const uid = () => Math.random().toString(36).slice(2);
const blankPart = () => ({
  key: uid(), part_name: '', is_own_stock: false, supplier_name: '', supplier_contact: '',
  purchase_reference: '', cost_price: '', sale_price: '', quantity: 1, warranty_days: '', notes: '',
});

export default function ReadyModal({ order, onClose, onSaved }) {
  const toast = useToast();
  const [noParts, setNoParts] = useState(!!order.no_parts_used);
  const [parts, setParts] = useState(() =>
    order.parts_used?.length ? order.parts_used.map((p) => ({ ...blankPart(), ...p, key: p.id || uid() })) : [blankPart()]
  );
  const [labor, setLabor] = useState(order.labor_amount || '');
  const [saving, setSaving] = useState(false);

  const update = (key, patch) => setParts((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const activeParts = noParts ? [] : parts;
  const sell = round2(activeParts.reduce((s, p) => s + (Number(p.sale_price) || 0) * (Number(p.quantity) || 1), 0));
  const cost = round2(activeParts.reduce((s, p) => s + (p.is_own_stock ? 0 : Number(p.cost_price) || 0) * (Number(p.quantity) || 1), 0));
  const total = order.is_warranty ? 0 : round2(sell + (Number(labor) || 0));

  const submit = async () => {
    if (!noParts) {
      for (const [i, p] of parts.entries()) {
        const n = `Peça ${i + 1}`;
        if (!p.part_name.trim()) return toast.error(`${n}: informe a descrição`);
        if (p.sale_price === '') return toast.error(`${n}: informe o valor de venda`);
        if (!p.is_own_stock) {
          if (!p.supplier_name.trim()) return toast.error(`${n}: informe o fornecedor`);
          if (!p.purchase_reference.trim()) return toast.error(`${n}: informe a OS/nota de compra`);
          if (p.cost_price === '') return toast.error(`${n}: informe o custo de compra`);
        }
      }
    }
    setSaving(true);
    try {
      const { data } = await api.patch(`/service-orders/${order.id}/ready`, {
        no_parts_used: noParts,
        labor_amount: Number(labor) || 0,
        parts_used: noParts
          ? []
          : parts.map((p) => ({
              part_name: p.part_name,
              is_own_stock: p.is_own_stock,
              supplier_name: p.supplier_name,
              supplier_contact: p.supplier_contact,
              purchase_reference: p.purchase_reference,
              cost_price: p.is_own_stock ? 0 : Number(p.cost_price),
              sale_price: Number(p.sale_price),
              quantity: Number(p.quantity) || 1,
              warranty_days: p.warranty_days === '' ? undefined : Number(p.warranty_days),
              notes: p.notes,
            })),
      });
      toast.success(`OS #${data.service_order_number} marcada como pronta`);
      onSaved(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Concluir conserto — OS #${order.service_order_number}`} onClose={onClose} size="lg">
      <p className="mb-4 text-sm text-slate-500">
        {order.device?.brand} {order.device?.model} · {order.customer?.name}. Registre as peças utilizadas e a mão de obra para marcar como pronta.
      </p>

      <label className="mb-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm font-medium">
        <input type="checkbox" checked={noParts} onChange={(e) => setNoParts(e.target.checked)} />
        Nenhuma peça foi utilizada neste reparo
      </label>

      {!noParts && (
        <div className="space-y-3">
          {parts.map((p, i) => (
            <div key={p.key} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">Peça {i + 1}</p>
                {parts.length > 1 && (
                  <button type="button" className="text-slate-400 hover:text-red-600" aria-label="Remover peça" onClick={() => setParts((l) => l.filter((x) => x.key !== p.key))}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-6">
                <Field label="Descrição *" className="sm:col-span-4">
                  <input className={inputCls} value={p.part_name} onChange={(e) => update(p.key, { part_name: e.target.value })} />
                </Field>
                <Field label="Qtd." className="sm:col-span-2">
                  <input className={inputCls} type="number" min="1" value={p.quantity} onChange={(e) => update(p.key, { quantity: e.target.value })} />
                </Field>

                <label className="flex items-center gap-2 text-sm font-medium sm:col-span-6">
                  <input type="checkbox" checked={p.is_own_stock} onChange={(e) => update(p.key, { is_own_stock: e.target.checked })} />
                  Fornecedor próprio (peça do estoque da loja — custo zero)
                </label>

                {!p.is_own_stock && (
                  <>
                    <Field label="Fornecedor *" className="sm:col-span-3">
                      <input className={inputCls} value={p.supplier_name} onChange={(e) => update(p.key, { supplier_name: e.target.value })} />
                    </Field>
                    <Field label="Contato do fornecedor" className="sm:col-span-3">
                      <input className={inputCls} value={p.supplier_contact} onChange={(e) => update(p.key, { supplier_contact: e.target.value })} />
                    </Field>
                    <Field label="OS / nota de compra *" className="sm:col-span-3">
                      <input className={inputCls} value={p.purchase_reference} onChange={(e) => update(p.key, { purchase_reference: e.target.value })} />
                    </Field>
                    <Field label="Custo de compra (R$) *" className="sm:col-span-3">
                      <input className={inputCls} type="number" min="0" step="0.01" value={p.cost_price} onChange={(e) => update(p.key, { cost_price: e.target.value })} />
                    </Field>
                  </>
                )}

                <Field label="Valor de venda (R$) *" className="sm:col-span-3">
                  <input className={inputCls} type="number" min="0" step="0.01" value={p.sale_price} onChange={(e) => update(p.key, { sale_price: e.target.value })} />
                </Field>
                <Field label="Garantia da peça (dias)" className="sm:col-span-3">
                  <input className={inputCls} type="number" min="0" value={p.warranty_days} onChange={(e) => update(p.key, { warranty_days: e.target.value })} />
                </Field>
              </div>
            </div>
          ))}
          <button type="button" className={btnGhost} onClick={() => setParts((l) => [...l, blankPart()])}>
            <Plus size={16} /> Adicionar peça
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Mão de obra (R$) — opcional">
          <input className={inputCls} type="number" min="0" step="0.01" value={labor} onChange={(e) => setLabor(e.target.value)} />
        </Field>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between"><span>Peças</span><b>{brl(sell)}</b></div>
          <div className="flex justify-between"><span>Mão de obra</span><b>{brl(Number(labor) || 0)}</b></div>
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-base"><span>Total ao cliente</span><b>{order.is_warranty ? 'Garantia (R$ 0,00)' : brl(total)}</b></div>
          <div className="flex justify-between text-xs text-slate-500"><span>Custo das peças</span><span>{brl(cost)}</span></div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button className={btnGhost} onClick={onClose}>Cancelar</button>
        <button className={btnPrimary} onClick={submit} disabled={saving}>{saving ? 'Salvando…' : 'Marcar como pronta'}</button>
      </div>
    </Modal>
  );
}