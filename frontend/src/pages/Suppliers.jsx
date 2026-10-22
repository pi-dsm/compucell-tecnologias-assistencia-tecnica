import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Power, Search } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDocument } from '../utils/format';
import { btnGhost, btnPrimary, btnSm, ConfirmModal, EmptyState, inputCls, PageHeader, Spinner } from '../components/ui';
import SupplierFormModal from '../components/SupplierFormModal';

const STATUS_FILTERS = [['active', 'Ativos'], ['inactive', 'Inativos'], ['all', 'Todos']];

export default function Suppliers() {
  const toast = useToast();
  const { user } = useAuth();
  const canEdit = user?.role !== 'technician';
  const [params, setParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('active');
  const [form, setForm] = useState(null); // null = fechado | {} = novo | fornecedor = edição
  const [toggling, setToggling] = useState(null);

  // Atalho da Home: /fornecedores?novo=1 abre o cadastro direto
  useEffect(() => {
    if (params.get('novo') === '1' && canEdit) {
      setForm({});
      setParams({}, { replace: true });
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/suppliers', { params: { q: q || undefined, status, limit: 500 } });
      setItems(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const toggle = async () => {
    try {
      await api.patch(`/suppliers/${toggling.id}/status`, { is_active: !toggling.is_active });
      toast.success(toggling.is_active ? 'Fornecedor inativado' : 'Fornecedor reativado');
      setToggling(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader title="Fornecedores" subtitle="Vinculados aos produtos e às peças usadas nas ordens de serviço.">
        {canEdit && <button className={btnPrimary} onClick={() => setForm({})}><Plus size={18} /> Novo fornecedor</button>}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-9`} placeholder="Buscar por nome, CNPJ/CPF, contato, cidade ou telefone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex rounded-lg bg-slate-200/70 p-1">
          {STATUS_FILTERS.map(([key, label]) => (
            <button key={key} onClick={() => setStatus(key)} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${status === key ? 'bg-white text-blue-700 shadow-card' : 'text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState>Nenhum fornecedor encontrado.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{['Fornecedor', 'CNPJ/CPF', 'Contato', 'Telefone', 'Cidade/UF', 'Situação', ''].map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((s) => (
                <tr key={s.id} className={s.is_active ? '' : 'bg-slate-50 text-slate-400'}>
                  <td className="px-3 py-2.5 font-semibold">{s.name}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{formatDocument(s.document) || '—'}</td>
                  <td className="px-3 py-2.5">{s.contact_name || '—'}</td>
                  <td className="px-3 py-2.5">{s.phone || '—'}</td>
                  <td className="px-3 py-2.5">{[s.city, s.state].filter(Boolean).join('/') || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${s.is_active ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>
                      {s.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {canEdit && (
                      <div className="flex justify-end gap-1.5">
                        <button className={`${btnGhost} ${btnSm}`} onClick={() => setForm(s)} aria-label="Editar"><Pencil size={14} /></button>
                        <button className={`${btnGhost} ${btnSm}`} onClick={() => setToggling(s)}><Power size={14} /> {s.is_active ? 'Inativar' : 'Reativar'}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <SupplierFormModal
          supplier={form.id ? form : undefined}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load();
          }}
        />
      )}

      {toggling && (
        <ConfirmModal
          title={toggling.is_active ? 'Inativar fornecedor' : 'Reativar fornecedor'}
          message={toggling.is_active ? `Inativar "${toggling.name}"? Ele deixa de aparecer nas listas de seleção, mas o histórico é preservado.` : `Reativar "${toggling.name}"?`}
          confirmLabel={toggling.is_active ? 'Inativar' : 'Reativar'}
          danger={toggling.is_active}
          onConfirm={toggle}
          onClose={() => setToggling(null)}
        />
      )}
    </div>
  );
}