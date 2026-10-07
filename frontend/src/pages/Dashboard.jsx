import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, ClipboardList, PlusCircle, Search, ShoppingCart, Wrench } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { brl, dt } from '../utils/format';
import { Card, Spinner, StatusBadge } from '../components/ui';

const PERIODS = [
  { key: 'daily', label: 'Diário' },
  { key: 'weekly', label: 'Semanal' },
  { key: 'monthly', label: 'Mensal' },
];

export default function Dashboard() {
  const toast = useToast();
  const [period, setPeriod] = useState('daily');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get('/dashboard', { params: { period } })
      .then((r) => alive && setData(r.data))
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [period]);

  const kpis = data && [
    { label: 'Em conserto', value: data.counts.in_repair, icon: Wrench, cls: 'bg-blue-100 text-blue-700' },
    { label: 'Prontos p/ retirada', value: data.counts.ready, icon: CheckCircle2, cls: 'bg-green-100 text-green-700' },
    { label: 'Em análise', value: data.counts.in_diagnosis, icon: Search, cls: 'bg-amber-100 text-amber-700' },
    { label: 'Recebidos', value: data.counts.received, icon: ClipboardList, cls: 'bg-slate-100 text-slate-700' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="text-2xl font-extrabold text-blue-900">Dashboard</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/ordens/nova" className="flex items-center justify-center gap-3 rounded-xl bg-orange-500 px-5 py-5 text-lg font-bold text-white shadow-md transition hover:bg-orange-600">
          <PlusCircle /> Nova Ordem de Serviço
        </Link>
        <Link to="/vendas/nova" className="flex items-center justify-center gap-3 rounded-xl bg-blue-700 px-5 py-5 text-lg font-bold text-white shadow-md transition hover:bg-blue-800">
          <ShoppingCart /> Nova Venda
        </Link>
      </div>

      {loading && !data ? (
        <Spinner />
      ) : (
        data && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {kpis.map(({ label, value, icon: Icon, cls }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className={`rounded-lg p-2.5 ${cls}`}><Icon size={22} /></div>
                  <div>
                    <p className="text-2xl font-extrabold text-slate-800">{value}</p>
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <Card
              title="Faturamento e OS fechadas"
              right={
                <div className="flex rounded-lg bg-slate-100 p-1">
                  {PERIODS.map((p) => (
                    <button key={p.key} onClick={() => setPeriod(p.key)} className={`rounded-md px-3 py-1 text-sm font-semibold transition ${period === p.key ? 'bg-blue-700 text-white shadow' : 'text-slate-600'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              }
            >
              <p className="mb-2 text-sm text-slate-500">
                Total no período: <strong className="text-orange-600">{brl(data.total_revenue)}</strong>
              </p>
              <div className={`h-72 w-full ${loading ? 'opacity-50' : ''}`}>
                <ResponsiveContainer>
                  <ComposedChart data={data.chart} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                    <YAxis yAxisId="r" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, n) => (n === 'Faturamento' ? brl(v) : v)} />
                    <Legend />
                    <Bar yAxisId="l" dataKey="faturamento" name="Faturamento" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="r" type="monotone" dataKey="os_fechadas" name="OS fechadas" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Atividades recentes" right={<Link to="/ordens" className="text-sm font-semibold text-blue-700 hover:underline">Ver todas</Link>}>
              {data.recent.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma OS registrada ainda.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recent.map((o) => (
                    <li key={o.id}>
                      <Link to={`/ordens/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-slate-50">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            #{o.service_order_number} · {o.customer.customer_name}
                          </p>
                          <p className="truncate text-xs text-slate-500">{o.device.device_brand} {o.device.device_model} · atualizado {dt(o.updated_at)}</p>
                        </div>
                        <StatusBadge status={o.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )
      )}
    </div>
  );
}