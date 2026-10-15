import { useCallback, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import useStatusFlow from '../../hooks/useStatusFlow';
import { isOverdue, timeAgo } from '../../utils/format';
import { EmptyState, Spinner } from '../ui';
import StatusSelect from '../os/StatusSelect';
import OrderDetailsModal from '../os/OrderDetailsModal';

// Cada filtro usa a própria listagem da API (sem endpoint extra)
const FILTERS = {
  oldest: { label: 'Mais antigas', hint: 'Recebidas e ainda sem andamento', params: { status: 'received', sort: 'oldest' }, when: (o) => `Entrou ${timeAgo(o.created_at)}` },
  ready: { label: 'Prontas', hint: 'Aguardando retirada há mais tempo', params: { status: 'ready', sort: 'ready_oldest' }, when: (o) => `Pronta ${timeAgo(o.ready_at)}` },
  recent: { label: 'Recentes', hint: 'Atualizadas por último', params: { scope: 'open', sort: 'updated' }, when: (o) => `Atualizada ${timeAgo(o.updated_at)}` },
};

export default function OrderQueuePanel({ onChanged }) {
  const toast = useToast();
  const [tab, setTab] = useState('oldest');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/service-orders', { params: { ...FILTERS[tab].params, limit: 8 } });
      setOrders(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const refresh = () => {
    load();
    onChanged?.();
  };
  const flow = useStatusFlow(refresh);
  const f = FILTERS[tab];

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Fila de OSs</h2>
      <div className="mt-3 flex rounded-lg bg-slate-100 p-1">
        {Object.entries(FILTERS).map(([key, v]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${tab === key ? 'bg-white text-blue-700 shadow-card' : 'text-slate-500'}`}>
            {v.label}
          </button>
        ))}
      </div>
      <p className="mb-3 mt-2 text-xs text-slate-500">{f.hint}</p>

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <EmptyState>Nada por aqui. 🎉</EmptyState>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id} onClick={() => setOpenId(o.id)} className="cursor-pointer rounded-lg border border-slate-200 p-2.5 transition hover:border-blue-300 hover:bg-blue-50/40">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-ink-900">#{o.service_order_number}</span>
                <StatusSelect order={o} onChange={flow.request} />
              </div>
              <p className="truncate text-sm font-semibold">{o.customer?.name}</p>
              <p className="truncate text-xs text-slate-500">{o.device?.brand} {o.device?.model}</p>
              <p className={`mt-1 flex items-center gap-1 text-xs ${isOverdue(o) ? 'font-bold text-red-600' : 'text-slate-400'}`}>
                <Clock size={12} /> {f.when(o)}{isOverdue(o) && ' · entrega atrasada'}
              </p>
            </li>
          ))}
        </ul>
      )}

      {openId && <OrderDetailsModal id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />}
      {flow.modals}
    </aside>
  );
}