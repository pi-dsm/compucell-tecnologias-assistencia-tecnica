import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { brl } from '../utils/format';
import { btnGhost, btnPrimary, btnSm, ConfirmModal, EmptyState, Field, inputCls, Modal, PageHeader, Spinner } from '../components/ui';

const blank = { name: '', description: '', price: '', cost_price: '' };

export default function Services() {
  const toast = useToast();
  const { user, isAdmin } = useAuth();
  const canEdit = user?.role !== 'technician';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await api.get('/services')).data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    const body = { name: form.name, description: form.description, price: Number(form.price), cost_price: Number(form.cost_price) || 0 };
    setSaving(true);
    try {
      if (form.id) await api.put(`/services/${form.id}`, body);
      else await api.post('/services', body);
      toast.success('Serviço salvo');
      setForm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/services/${removing.id}`);
      toast.success('Serviço desativado');
      setRemoving(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title="Serviços avulsos" subtitle="Serviços de balcão vendidos no PDV, como xerox, impressão e formatação.">
        {canEdit && <button className={btnPrimary} onClick={() => setForm({ ...blank })}><Plus size={18} /> Novo serviço</button>}
      </PageHeader>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState>Nenhum serviço cadastrado.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-800">{s.name}</p>
                  {s.description && <p className="text-sm text-slate-500">{s.description}</p>}
                </div>
                <p className="text-lg font-extrabold text-orange-600">{brl(s.price)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Custo de insumo: {brl(s.cost_price)}</span>
                {canEdit && (
                  <div className="flex gap-1.5">
                    <button className={`${btnGhost} ${btnSm}`} onClick={() => setForm({ ...s })} aria-label="Editar"><Pencil size={14} /></button>
                    {isAdmin && <button className={`${btnGhost} ${btnSm} text-red-600`} onClick={() => setRemoving(s)} aria-label="Desativar"><Trash2 size={14} /></button>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal title={form.id ? 'Editar serviço' : 'Novo serviço'} onClose={() => setForm(null)} size="sm">
          <form onSubmit={save} className="space-y-3">
            <Field label="Nome *"><input className={inputCls} required autoFocus value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></Field>
            <Field label="Descrição"><input className={inputCls} value={form.description || ''} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço (R$) *"><input className={inputCls} type="number" min="0" step="0.01" required value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} /></Field>
              <Field label="Custo de insumo (R$)"><input className={inputCls} type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm((s) => ({ ...s, cost_price: e.target.value }))} /></Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>Cancelar</button>
              <button className={btnPrimary} disabled={saving}>{saving ? 'Salvando…' : 'Salvar serviço'}</button>
            </div>
          </form>
        </Modal>
      )}

      {removing && (
        <ConfirmModal title="Desativar serviço" message={`Desativar "${removing.name}"? Ele deixa de aparecer no PDV.`} confirmLabel="Desativar" danger onConfirm={remove} onClose={() => setRemoving(null)} />
      )}
    </div>
  );
}