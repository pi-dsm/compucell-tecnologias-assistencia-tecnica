import { brl } from '../../utils/format';

// Lista com barras proporcionais. items: [{ name, count? , revenue? }]
// valueKey 'count' mostra número; 'revenue' mostra reais.
export default function RankList({ items, empty = 'Sem dados na janela.', valueKey = 'count', barClass = 'bg-orange-500' }) {
  if (!items.length) return <p className="text-sm text-slate-400">{empty}</p>;
  const max = Math.max(...items.map((i) => i[valueKey])) || 1;
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.name}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="truncate font-medium">{i.name}</span>
            <b className="whitespace-nowrap">{valueKey === 'revenue' ? brl(i.revenue) : i[valueKey]}</b>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className={`h-full rounded-full ${barClass}`} style={{ width: `${(i[valueKey] / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}