import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Columns3, LayoutGrid, List, PlusCircle, Search } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useStatusFlow from '../hooks/useStatusFlow';
import { STATUS } from '../utils/format';
import { btnPrimary, EmptyState, inputCls, PageHeader, Spinner } from '../components/ui';
import KanbanView from '../components/os/KanbanView';
import WorkspaceView from '../components/os/WorkspaceView';
import TableView from '../components/os/TableView';
// import OrderDetailsModal from '../components/os/OrderDetailsModal';

const VIEWS = [
  { key: 'kanban', label: 'Kanban', icon: Columns3 },
  { key: 'workspace', label: 'Workspace', icon: LayoutGrid },
  { key: 'table', label: 'Tabela', icon: List },
];

export default function ServiceOrders() {
  const toast = useToast();
  const { user, updatePreferences } = useAuth();
  const view = user?.preferences?.orders_view || 'kanban';
  const savedOrder = user?.preferences?.workspace_order || [];

  const [orders, setOrders] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/service-orders', {
        params: { q: q || undefined, status: view !== 'kanban' ? status || undefined : undefined, limit: 300 },
      });
      setOrders(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q, status, view]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const flow = useStatusFlow(load);

  // Reordenar um subconjunto filtrado não pode apagar a posição das demais OSs
  const handleReorder = (ids) => {
    const rest = savedOrder.filter((id) => !ids.includes(id));
    updatePreferences({ workspace_order: [...ids, ...rest] });
  };

  const shared = { orders, onOpen: (o) => setOpenId(o.id), onStatusChange: flow.request };

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <PageHeader title="Ordens de serviço" subtitle="Arraste os cartões ou use o seletor para mudar o status.">
        <div className="flex rounded-lg bg-slate-200/70 p-1" role="tablist" aria-label="Visualização">
          {VIEWS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={view === key}
              onClick={() => updatePreferences({ orders_view: key })}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${view === key ? 'bg-white text-blue-700 shadow-card' : 'text-slate-600'}`}
            >
              <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
        <Link to="/ordens/nova" className={btnPrimary}><PlusCircle size={18} /> Nova OS</Link>
      </PageHeader>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className={`${inputCls} pl-9`} placeholder="Buscar por nº da OS, cliente, telefone ou aparelho…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {view !== 'kanban' && (
        <div className="flex flex-wrap gap-2">
          {[['', 'Todas'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
            <button key={k} onClick={() => setStatus(k)} className={`rounded-full px-3 py-1 text-sm font-semibold transition ${status === k ? 'bg-blue-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <EmptyState>Nenhuma ordem de serviço encontrada.</EmptyState>
      ) : view === 'kanban' ? (
        <KanbanView {...shared} />
      ) : view === 'workspace' ? (
        <WorkspaceView {...shared} savedOrder={savedOrder} onReorder={handleReorder} />
      ) : (
        <TableView {...shared} />
      )}

      {openId && <OrderDetailsModal id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
      {flow.modals}
    </div>
  );
}