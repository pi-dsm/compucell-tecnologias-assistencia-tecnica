import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, Package, PackageCheck, Search, Stethoscope, Wrench, XCircle } from 'lucide-react';
import api, { errMsg } from '../services/api';
import { btnPrimary, inputCls, Spinner } from '../components/ui';

const STEPS = [
  { key: 'received', label: 'Aparelho Recebido', icon: ClipboardCheck },
  { key: 'in_diagnosis', label: 'Em Análise', icon: Stethoscope },
  { key: 'in_repair', label: 'Em Manutenção', icon: Wrench },
  { key: 'ready', label: 'Pronto para Retirada', icon: PackageCheck },
  { key: 'delivered', label: 'Entregue', icon: Package },
];
const d = (v) => (v ? new Date(v).toLocaleDateString('pt-BR') : null);

export default function PublicTracking() {
  const [number, setNumber] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.get(`/public/service-orders/${number.trim()}`);
      setResult(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const current = result ? STEPS.findIndex((s) => s.key === result.status) : -1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 p-4 sm:p-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500"><Search size={28} /></div>
          <h1 className="text-2xl font-extrabold">Acompanhe seu aparelho</h1>
          <p className="text-sm text-blue-100">Digite o número da sua Ordem de Serviço</p>
        </div>

        <form onSubmit={search} className="mb-5 flex gap-2 rounded-2xl bg-white p-3 shadow-xl">
          <input inputMode="numeric" required className={inputCls} placeholder="Ex.: 1001" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))} />
          <button className={btnPrimary} disabled={loading}>Consultar</button>
        </form>

        {loading && <div className="rounded-2xl bg-white p-4"><Spinner /></div>}
        {error && <p className="rounded-2xl bg-white p-5 text-center font-medium text-red-600 shadow-xl">{error}</p>}

        {result && (
          <div className="rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <p className="text-xs font-medium uppercase text-slate-500">Ordem de Serviço</p>
              <p className="text-2xl font-extrabold text-blue-900">#{result.service_order_number}</p>
              <p className="text-sm text-slate-600">{result.device}</p>
              <p className="text-xs text-slate-500">Recebido em {d(result.received_at)}{result.estimated_delivery_at && ` · Previsão: ${d(result.estimated_delivery_at)}`}</p>
            </div>

            {result.status === 'cancelled' ? (
              <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-red-700">
                <XCircle /> <span className="font-semibold">Esta ordem de serviço foi cancelada. Entre em contato com a loja.</span>
              </div>
            ) : (
              <ol className="space-y-0">
                {STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const done = i < current;
                  const active = i === current;
                  return (
                    <li key={s.key} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${done ? 'bg-emerald-500 text-white' : active ? 'animate-pulse bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          {done ? <CheckCircle2 size={22} /> : <Icon size={22} />}
                        </div>
                        {i < STEPS.length - 1 && <div className={`h-8 w-1 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
                      </div>
                      <div className="pt-2">
                        <p className={`font-bold ${active ? 'text-orange-600' : done ? 'text-emerald-700' : 'text-slate-400'}`}>{s.label}</p>
                        {active && s.key === 'ready' && result.finished_at && <p className="text-xs text-slate-500">Desde {d(result.finished_at)}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}

        <Link to="/login" className="mt-6 block text-center text-sm text-blue-100 hover:underline">Acesso para funcionários</Link>
      </div>
    </div>
  );
}