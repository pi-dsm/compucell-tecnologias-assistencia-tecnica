import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, ShieldAlert, ShoppingCart, Target, Wrench } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { brl, greeting, STATUS, todayLong, WEEKDAYS } from '../utils/format';
import { btnGhost, btnSm, Card, Spinner } from '../components/ui';
import OrderQueuePanel from '../components/dashboard/OrderQueuePanel';
import GoalsModal from '../components/dashboard/GoalsModal';

const PERIODS = [
  { key: 'daily', label: 'Diário', now: 'Hoje', prev: 'ontem' },
  { key: 'weekly', label: 'Semanal', now: 'Últimos 7 dias', prev: '7 dias anteriores' },
  { key: 'monthly', label: 'Mensal', now: 'Este mês', prev: 'mês anterior' },
];

function Kpi({ label, value, children, tone = 'text-ink-900' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone}`}>{value}</p>
      <div className="mt-1 text-xs text-slate-500">{children}</div>
    </div>
  );
}

function RankList({ items, empty }) {
  if (!items.length) return <p className="text-sm text-slate-400">{empty}</p>;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.name}>
          <div className="flex justify-between text-sm"><span className="truncate font-medium">{i.name}</span><b>{i.count}</b></div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${(i.count / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const toast = useToast();
  const { user, isAdmin } = useAuth();
  const [period, setPeriod] = useState('daily');
  const [data, setData] = useState(null);
  const [goals, setGoals] = useState(null);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [summary, g] = await Promise.all([api.get('/dashboard/summary', { params: { period } }), api.get('/dashboard/goals')]);
      setData(summary.data);
      setGoals(g.data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const info = PERIODS.find((p) => p.key === period);
  const firstName = user?.name?.split(' ')[0] || '';
  const c = data?.current;
  const delta = data?.delta_revenue_pct;
  const progress = data?.goal?.progress;

  const weekdays = data?.trackers.weekdays.map((w) => ({ ...w, name: WEEKDAYS[w.weekday] })) || [];
  const peak = weekdays.reduce((best, w) => (w.orders + w.sales > (best?.orders || 0) + (best?.sales || 0) ? w : best), null);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">{greeting()}, {firstName}!</h1>
        <p className="mt-0.5 text-slate-500">{todayLong()}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/ordens/nova" className="group flex items-center gap-4 rounded-2xl bg-orange-500 p-6 text-white shadow-pop transition hover:bg-orange-600">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-white/20"><Wrench size={28} /></span>
          <span><span className="block text-2xl font-extrabold">Nova OS</span><span className="text-orange-50">Abrir ordem de serviço</span></span>
        </Link>
        <Link to="/vendas/nova" className="group flex items-center gap-4 rounded-2xl bg-ink-900 p-6 text-white shadow-pop transition hover:bg-ink-800">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-white/15"><ShoppingCart size={28} /></span>
          <span><span className="block text-2xl font-extrabold">Nova Venda</span><span className="text-blue-100">Produtos e serviços no balcão</span></span>
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          {!data ? (
            <Spinner />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {['received', 'in_diagnosis', 'in_repair', 'ready'].map((s) => (
                  <Link key={s} to="/ordens" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card hover:border-blue-300">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-600"><i className={`h-2.5 w-2.5 rounded-full ${STATUS[s].bar}`} />{STATUS[s].label}</span>
                    <b className="text-2xl text-ink-900">{data.counts[s]}</b>
                  </Link>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex rounded-lg bg-slate-200/70 p-1" role="tablist" aria-label="Período">
                  {PERIODS.map((p) => (
                    <button key={p.key} role="tab" aria-selected={period === p.key} onClick={() => setPeriod(p.key)} className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${period === p.key ? 'bg-white text-blue-700 shadow-card' : 'text-slate-600'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="text-sm font-semibold text-slate-500">{info.now}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi label="Faturamento" value={brl(c.revenue)}>
                  {delta === null ? 'Sem base de comparação' : (
                    <span className={`inline-flex items-center gap-0.5 font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(delta).toLocaleString('pt-BR')}%
                      <span className="font-normal text-slate-500"> vs {info.prev}</span>
                    </span>
                  )}
                </Kpi>
                <Kpi label="Lucro líquido" value={brl(c.net_profit)} tone={c.net_profit < 0 ? 'text-red-600' : 'text-emerald-700'}>
                  {c.delivered_orders} OS entregues · {c.sales_count} vendas
                </Kpi>
                <Kpi label="Perdas (garantia)" value={brl(c.loss)} tone={c.loss > 0 ? 'text-red-600' : 'text-ink-900'}>
                  <span className="inline-flex items-center gap-1"><ShieldAlert size={13} /> {data.warranty_returns} retorno(s) na janela do gráfico</span>
                </Kpi>
                <Kpi label={`Meta ${info.label.toLowerCase()}`} value={data.goal.target > 0 ? `${progress ?? 0}%` : '—'}>
                  {data.goal.target > 0 ? (
                    <>
                      <div className="mb-1 h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(progress || 0, 100)}%` }} /></div>
                      {brl(c.revenue)} de {brl(data.goal.target)}
                    </>
                  ) : (
                    'Nenhuma meta definida'
                  )}
                  {isAdmin && <button className={`${btnGhost} ${btnSm} mt-2 w-full`} onClick={() => setGoalsOpen(true)}><Target size={13} /> Definir metas</button>}
                </Kpi>
              </div>

              <Card title="Faturamento e lucro">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.series}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$ ${v}`} width={70} />
                      <Tooltip formatter={(v) => brl(v)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Faturamento" fill="#f97316" radius={[4, 4, 0, 0]} />
                      <Line dataKey="net_profit" name="Lucro líquido" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line dataKey="loss" name="Perdas" stroke="#dc2626" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card title="Marcas mais atendidas"><RankList items={data.trackers.brands} empty="Sem OS na janela." /></Card>
                <Card title="Modelos mais atendidos"><RankList items={data.trackers.models} empty="Sem OS na janela." /></Card>
                <Card title="Dias de pico" right={peak && (peak.orders + peak.sales) > 0 ? <span className="text-xs font-bold text-orange-600">Pico: {peak.name}</span> : null}>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekdays}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} width={28} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="orders" name="OS abertas" stackId="a" fill="#1d4ed8" />
                        <Bar dataKey="sales" name="Vendas" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
              <p className="text-xs text-slate-400">Marcas, modelos e dias de pico consideram toda a janela do gráfico ({period === 'daily' ? '7 dias' : period === 'weekly' ? '8 semanas' : '6 meses'}).</p>
            </>
          )}
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <OrderQueuePanel onChanged={load} />
        </div>
      </div>

      {goalsOpen && goals && (
        <GoalsModal
          goals={goals}
          onClose={() => setGoalsOpen(false)}
          onSaved={() => {
            setGoalsOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}