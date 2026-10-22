import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { useToast } from '../context/ToastContext';
import { btnPrimary, EmptyState, PageHeader, Spinner } from '../components/ui';
import SaleCard from '../components/sales/SaleCard';

const WINDOWS = [
  ['24h', 'Últimas 24 horas'],
  ['7d', 'Últimos 7 dias'],
];

export default function SalesHistory() {
  const toast = useToast();
  const [period, setPeriod] = useState('24h');
  const [sales, setSales] = useState(null);
  const [open, setOpen] = useState(() => new Set());

  const load = useCallback(async () => {
    try {
      setSales((await api.get('/sales', { params: { period } })).data);
    } catch (e) {
      toast.error(errMsg(e));
      setSales([]);
    }
  }, [period]);

  useEffect(() => {
    setSales(null);
    load();
  }, [load]);

  const toggle = (id) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader title="Histórico de vendas" subtitle="Cada venda aparece uma única vez, mesmo com vários itens. Vendas com mais de 7 dias saem desta lista.">
        <Link to="/vendas/nova" className={btnPrimary}><PlusCircle size={18} /> Nova venda</Link>
      </PageHeader>

      <div className="flex rounded-lg bg-slate-200/70 p-1 sm:inline-flex" role="tablist" aria-label="Janela de tempo">
        {WINDOWS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={period === key} onClick={() => setPeriod(key)} className={`flex-1 rounded-md px-4 py-1.5 text-sm font-semibold transition ${period === key ? 'bg-white text-blue-700 shadow-card' : 'text-slate-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {!sales ? (
        <Spinner />
      ) : sales.length === 0 ? (
        <EmptyState>Nenhuma venda nesta janela de tempo.</EmptyState>
      ) : (
        <div className="space-y-3">
          {sales.map((s) => (
            <SaleCard key={s.id} sale={s} expanded={open.has(s.id)} onToggle={() => toggle(s.id)} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}