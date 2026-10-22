import { useCallback, useEffect, useState } from 'react';
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Target } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { brl, METHODS } from '../utils/format';
import { btnGhost, btnSm, Card, PageHeader, Spinner } from '../components/ui';
import RankList from '../components/dashboard/RankList';
import GoalsModal from '../components/dashboard/GoalsModal';

const PERIODS = [
  { key: 'daily', label: 'Diário', now: 'Hoje', prev: 'ontem' },
  { key: 'weekly', label: 'Semanal', now: 'Últimos 7 dias', prev: '7 dias anteriores' },
  { key: 'monthly', label: 'Mensal', now: 'Este mês', prev: 'mês anterior' },
];
const pct = (v) => `${Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

function Kpi({ label, value, tone = 'text-ink-900', children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone}`}>{value}</p>
      <div className="mt-1 text-xs text-slate-500">{children}</div>
    </div>
  );
}

function SplitCard({ title, color, data }) {
  return (
    <Card title={title}>
      <p className="text-3xl font-extrabold" style={{ color }}>{brl(data.revenue)}</p>
      <p className="text-sm text-slate-500">{pct(data.share_pct)} das vendas · {data.quantity} un.</p>
      <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.min(data.share_pct, 100)}%`, background: color }} /></div>
      <div className="mt-3 flex justify-between text-sm">
        <span>Lucro <b className="text-emerald-700">{brl(data.profit)}</b></span>
        <span>Margem <b>{pct(data.margin_pct)}</b></span>
      </div>
    </Card>
  );
}

export default function SalesDashboard() {
  const toast = useToast();
  const [period, setPeriod] = useState('daily');
  const [data, setData] = useState(null);
  const [goals, setGoals] = useState(null);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [res, g] = await Promise.all([
        api.get('/dashboard/sales', { params: { period } }),
        api.get('/dashboard/goals', { params: { scope: 'sales' } }),
      ]);
      setData(res.data);
      setGoals(g.data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [period]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const info = PERIODS.find((p) => p.key === period);
  const c = data?.current;
  const delta = data?.delta_revenue_pct;
  const progress = data?.goal.progress;
  const pieData = data ? [{ name: 'Produtos', value: data.split.products.revenue }, { name: 'Serviços', value: data.split.services.revenue }] : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Dashboard de Vendas & Serviços" subtitle="Metas, lucro e vendas reais do balcão. Valores vendidos, já líquidos de desconto.">
        <div className="flex rounded-lg bg-slate-200/70 p-1" role="tablist" aria-label="Período">
          {PERIODS.map((p) => (
            <button key={p.key} role="tab" aria-selected={period === p.key} onClick={() => setPeriod(p.key)} className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${period === p.key ? 'bg-white text-blue-700 shadow-card' : 'text-slate-600'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {!data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi label={`Vendas reais · ${info.now}`} value={brl(c.revenue)}>
              {delta === null ? 'Sem base de comparação' : (
                <span className={`inline-flex items-center gap-0.5 font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(delta).toLocaleString('pt-BR')}%
                  <span className="font-normal text-slate-500"> vs {info.prev}</span>
                </span>
              )}
            </Kpi>
            <Kpi label="Lucro" value={brl(c.profit)} tone={c.profit < 0 ? 'text-red-600' : 'text-emerald-700'}>Margem de {pct(c.margin_pct)}</Kpi>
            <Kpi label="Meta" value={data.goal.target > 0 ? pct(progress) : '—'}>
              {data.goal.target > 0 ? (
                <>
                  <div className="mb-1 h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(progress || 0, 100)}%` }} /></div>
                  {data.goal.remaining > 0 ? `Faltam ${brl(data.goal.remaining)} de ${brl(data.goal.target)}` : `Meta de ${brl(data.goal.target)} atingida!`}
                </>
              ) : 'Nenhuma meta definida'}
              <button className={`${btnGhost} ${btnSm} mt-2 w-full`} onClick={() => setGoalsOpen(true)}><Target size={13} /> Definir metas</button>
            </Kpi>
            <Kpi label="Vendas realizadas" value={c.sales_count}>{c.items_sold} itens vendidos</Kpi>
            <Kpi label="Ticket médio" value={brl(c.avg_ticket)}>por venda</Kpi>
          </div>

          <Card title="Meta × lucro × vendas reais">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$ ${v}`} width={70} />
                  <Tooltip formatter={(v) => brl(v)} />
                  <Legend />
                  <Bar dataKey="products_revenue" name="Produtos" stackId="rev" fill="#1d4ed8" />
                  <Bar dataKey="services_revenue" name="Serviços" stackId="rev" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Line dataKey="profit" name="Lucro" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} />
                  {data.goal.target > 0 && <Line dataKey="goal" name="Meta" stroke="#dc2626" strokeWidth={2} strokeDasharray="6 4" dot={false} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <SplitCard title="Produtos" color="#1d4ed8" data={data.split.products} />
            <SplitCard title="Serviços" color="#f97316" data={data.split.services} />
            <Card title="Participação nas vendas">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2}>
                      <Cell fill="#1d4ed8" />
                      <Cell fill="#f97316" />
                    </Pie>
                    <Tooltip formatter={(v) => brl(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-xs text-slate-500">{pct(data.split.products.share_pct)} produtos · {pct(data.split.services.share_pct)} serviços</p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Produtos mais vendidos (R$)"><RankList items={data.top.products} valueKey="revenue" empty="Sem vendas de produtos na janela." barClass="bg-blue-600" /></Card>
            <Card title="Serviços mais vendidos (R$)"><RankList items={data.top.services} valueKey="revenue" empty="Sem serviços na janela." /></Card>
            <Card title="Formas de pagamento (R$)">
              <RankList items={data.methods.map((m) => ({ name: METHODS[m.method] || m.method, revenue: m.amount }))} valueKey="revenue" empty="Sem pagamentos na janela." barClass="bg-emerald-600" />
            </Card>
          </div>
          <p className="text-xs text-slate-400">Rankings e formas de pagamento consideram toda a janela do gráfico ({period === 'daily' ? '7 dias' : period === 'weekly' ? '8 semanas' : '6 meses'}). Metas daqui são independentes das metas gerais da Home.</p>
        </>
      )}

      {goalsOpen && goals && (
        <GoalsModal
          scope="sales"
          title="Metas de vendas e serviços"
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