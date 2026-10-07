import { useEffect, useState } from 'react';
import { Pencil, Power, UserPlus } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/format';
import { btnGhost, btnPrimary, Card, Field, inputCls, Spinner } from '../components/ui';

const empty = { id: null, name: '', email: '', phone: '', role: 'attendant', password: '' };

export default function Users() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/users').then((r) => setUsers(r.data)).catch((e) => toast.error(errMsg(e))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name, email: form.email, phone: form.phone, role: form.role };
      if (form.password) payload.password = form.password;
      if (form.id) await api.put(`/users/${form.id}`, payload);
      else await api.post('/users', payload);
      toast.success(form.id ? 'Usuário atualizado' : 'Funcionário cadastrado');
      setForm(empty);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (u) => {
    try {
      const { data } = await api.patch(`/users/${u.id || u._id}/toggle-status`);
      toast.success(data.is_active ? 'Acesso reativado' : 'Acesso desativado');
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-2xl font-extrabold text-blue-900">Gerenciamento de Usuários</h1>

      <Card title={form.id ? 'Editar funcionário' : 'Cadastrar novo funcionário'}>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome *"><input required className={inputCls} value={form.name} onChange={set('name')} /></Field>
          <Field label="E-mail *"><input required type="email" className={inputCls} value={form.email} onChange={set('email')} /></Field>
          <Field label="Telefone"><input className={inputCls} value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Nível de acesso">
            <select className={inputCls} value={form.role} onChange={set('role')}>
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label={form.id ? 'Nova senha (deixe vazio para manter)' : 'Senha * (mín. 6 caracteres)'} className="sm:col-span-2">
            <input type="password" minLength={6} required={!form.id} className={inputCls} value={form.password} onChange={set('password')} autoComplete="new-password" />
          </Field>
          <div className="flex gap-3 sm:col-span-2">
            <button disabled={saving} className={btnPrimary}><UserPlus size={16} /> {saving ? 'Salvando...' : form.id ? 'Salvar alterações' : 'Cadastrar'}</button>
            {form.id && <button type="button" className={btnGhost} onClick={() => setForm(empty)}>Cancelar edição</button>}
          </div>
        </form>
      </Card>

      {loading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-blue-900 text-xs uppercase text-white">
              <tr><th className="px-4 py-3">Nome</th><th>E-mail</th><th>Telefone</th><th>Acesso</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const uid = u.id || u._id;
                return (
                  <tr key={uid} className={u.is_active ? '' : 'bg-slate-50 text-slate-400'}>
                    <td className="px-4 py-3 font-semibold">{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td>{ROLES[u.role]}</td>
                    <td><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>{u.is_active ? 'Ativo' : 'Inativo'}</span></td>
                    <td className="whitespace-nowrap py-2 text-right">
                      <button title="Editar" onClick={() => { setForm({ id: uid, name: u.name, email: u.email, phone: u.phone || '', role: u.role, password: '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="mr-1 rounded-lg p-2 text-blue-700 hover:bg-blue-50"><Pencil size={16} /></button>
                      <button title={u.is_active ? 'Desativar' : 'Ativar'} disabled={uid === (me?.id || me?._id)} onClick={() => toggle(u)} className={`mr-3 rounded-lg p-2 disabled:opacity-30 ${u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}><Power size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}