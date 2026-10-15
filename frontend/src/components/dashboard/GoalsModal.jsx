import { useState } from 'react';
import api, { errMsg } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { btnGhost, btnPrimary, Field, inputCls, Modal } from '../ui';

export default function GoalsModal({ goals, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ daily: goals.daily || '', weekly: goals.weekly || '', monthly: goals.monthly || '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/dashboard/goals', { daily: Number(form.daily) || 0, weekly: Number(form.weekly) || 0, monthly: Number(form.monthly) || 0 });
      toast.success('Metas atualizadas');
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Metas de faturamento" onClose={onClose} size="sm">
      <p className="mb-3 text-sm text-slate-500">O progresso compara o faturamento recebido no período com a meta. Use 0 para desativar.</p>
      <div className="space-y-3">
        {[['daily', 'Meta diária (R$)'], ['weekly', 'Meta semanal — últimos 7 dias (R$)'], ['monthly', 'Meta mensal (R$)']].map(([key, label]) => (
          <Field key={key} label={label}>
            <input className={inputCls} type="number" min="0" step="0.01" value={form[key]} onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))} />
          </Field>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className={btnGhost} onClick={onClose}>Cancelar</button>
        <button className={btnPrimary} onClick={save} disabled={saving}>Salvar metas</button>
      </div>
    </Modal>
  );
}