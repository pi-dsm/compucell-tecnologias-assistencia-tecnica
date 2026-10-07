import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { brl, dt, STATUS } from '../utils/format';
import { btnPrimary, inputCls, Spinner, StatusBadge } from '../components/ui';

export default function ServiceOrders() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api
        .get('/service-orders', { params: { status: status || undefined, q: q || undefined } })
        .then((r) => setOrders(r.data))
        .catch((e) => toast.error(errMsg(e)))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [status, q]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-blue-900">Ordens de Serviço</h1>
        <Link to="/ordens/nova" className={btnPrimary}><PlusCircle size={18} /> Nova OS</Link>
      </div>

      <input className={inputCls} placeholder="Buscar por nº da OS, cliente, telefone ou aparelho..." value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="flex flex-wrap gap-2">
        {[['', 'Todas'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <button key={k} onClick={() => setStatus(k)} className={`rounded-full px-3 py-1 text-sm font-semibold transition ${status === k ? 'bg-blue-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm">Nenhuma ordem de serviço encontrada.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((o) => (
            <Link key={o.id} to={`/ordens/${o.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-400 hover:shadow-md">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-lg font-extrabold text-blue-900">#{o.service_order_number}</span>
                <StatusBadge status={o.status} />
              </div>
              <p className="text-sm font-semibold text-slate-800">{o.customer.customer_name}</p>
              <p className="text-sm text-slate-600">{o.device.device_brand} {o.device.device_model}</p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{o.reported_issue}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{dt(o.created_at)}</span>
                <span className="font-bold text-orange-600">{brl(o.grand_total_amount)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}