import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { resetHolidayCache } from '../hooks/useHolidayCalendar';
import { btnGhost, btnPrimary, btnSm, Card, ConfirmModal, Field, inputCls, PageHeader, Spinner } from '../components/ui';

const SCOPES = { municipal: 'Municipal', state: 'Estadual', optional: 'Ponto facultativo' };
const fmtDate = (key) => (key.length === 5 ? `${key.slice(3)}/${key.slice(0, 2)} (todo ano)` : new Date(`${key}T12:00:00`).toLocaleDateString('pt-BR'));

export default function Holidays() {
  const toast = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ date: '', recurring: true, name: '', scope: 'municipal' });
  const [removing, setRemoving] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setData((await api.get('/holidays', { params: { year } })).data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.date) return toast.error('Informe a data do feriado');
    // <input type="date"> devolve AAAA-MM-DD; para feriado anual guardamos só MM-DD
    const date = form.recurring ? form.date.slice(5) : form.date;
    setSaving(true);
    try {
      await api.post('/holidays', { date, name: form.name, scope: form.scope });
      toast.success('Feriado cadastrado');
      setForm((s) => ({ ...s, date: '', name: '' }));
      resetHolidayCache();
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/holidays/${removing.id}`);
      toast.success('Feriado removido');
      setRemoving(null);
      resetHolidayCache();
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  if (!data) return <Spinner />;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader title="Feriados" subtitle="Os prazos das OSs ignoram fins de semana e os feriados abaixo." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Feriados locais"
          right={null}
        >
          <form onSubmit={save} className="mb-4 space-y-3 rounded-lg bg-slate-50 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Data *"><input type="date" className={inputCls} value={form.date} onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))} /></Field>
              <Field label="Tipo">
                <select className={inputCls} value={form.scope} onChange={(e) => setForm((s) => ({ ...s, scope: e.target.value }))}>
                  {Object.entries(SCOPES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Nome *"><input className={inputCls} required value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.recurring} onChange={(e) => setForm((s) => ({ ...s, recurring: e.target.checked }))} /> Repete todo ano</label>
            <button className={`${btnPrimary} ${btnSm}`} disabled={saving}><Plus size={14} /> Adicionar feriado</button>
          </form>

          {data.custom.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum feriado local cadastrado.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {data.custom.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2">
                  <span><b>{fmtDate(h.date)}</b> · {h.name} <span className="text-xs text-slate-400">({SCOPES[h.scope]})</span></span>
                  <button className={`${btnGhost} ${btnSm} text-red-600`} onClick={() => setRemoving(h)} aria-label="Remover"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={`Feriados nacionais ${year}`}
          right={
            <div className="flex gap-1">
              <button className={`${btnGhost} ${btnSm}`} onClick={() => setYear((y) => y - 1)}>‹</button>
              <button className={`${btnGhost} ${btnSm}`} onClick={() => setYear((y) => y + 1)}>›</button>
            </div>
          }
        >
          <ul className="divide-y divide-slate-100 text-sm">
            {data.national.map((h) => (
              <li key={h.date} className="flex justify-between py-2"><span>{h.name}</span><b>{fmtDate(h.date)}</b></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">Calculados automaticamente (inclui a Sexta-feira Santa).</p>
        </Card>
      </div>

      {removing && <ConfirmModal title="Remover feriado" message={`Remover "${removing.name}"? Prazos já calculados não mudam.`} confirmLabel="Remover" danger onConfirm={remove} onClose={() => setRemoving(null)} />}
    </div>
  );
}