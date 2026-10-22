import { useState } from 'react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { BR_STATES, formatDocument, formatPhone } from '../utils/format';
import { btnGhost, btnPrimary, Field, inputCls, Modal } from './ui';

const blank = { name: '', document: '', contact_name: '', phone: '', email: '', address: '', city: '', state: '', notes: '' };

// supplier = objeto existente (edição) ou undefined (novo)
export default function SupplierFormModal({ supplier, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...blank, ...(supplier || {}) });
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((s) => ({ ...s, ...patch }));

  const save = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(Object.keys(blank).map((k) => [k, form[k] ?? '']));
    setSaving(true);
    try {
      const { data } = supplier?.id ? await api.put(`/suppliers/${supplier.id}`, body) : await api.post('/suppliers', body);
      toast.success('Fornecedor salvo');
      onSaved(data);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={supplier?.id ? 'Editar fornecedor' : 'Novo fornecedor'} onClose={onClose}>
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome / razão social *" className="sm:col-span-2">
          <input className={inputCls} required autoFocus value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="CNPJ ou CPF">
          <input className={inputCls} inputMode="numeric" value={form.document} onChange={(e) => set({ document: e.target.value })} onBlur={() => set({ document: formatDocument(form.document) })} />
        </Field>
        <Field label="Pessoa de contato">
          <input className={inputCls} value={form.contact_name} onChange={(e) => set({ contact_name: e.target.value })} />
        </Field>
        <Field label="Telefone / WhatsApp">
          <input className={inputCls} inputMode="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} onBlur={() => set({ phone: formatPhone(form.phone) })} />
        </Field>
        <Field label="E-mail">
          <input className={inputCls} type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Endereço" className="sm:col-span-2">
          <input className={inputCls} value={form.address} onChange={(e) => set({ address: e.target.value })} />
        </Field>
        <Field label="Cidade">
          <input className={inputCls} value={form.city} onChange={(e) => set({ city: e.target.value })} />
        </Field>
        <Field label="UF">
          <select className={inputCls} value={form.state} onChange={(e) => set({ state: e.target.value })}>
            <option value="">—</option>
            {BR_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
        <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary} disabled={saving}>{saving ? 'Salvando…' : 'Salvar fornecedor'}</button>
        </div>
      </form>
    </Modal>
  );
}