import { brl, dateOnly, dt, isOverdue } from '../../utils/format';
import StatusSelect from './StatusSelect';

export default function TableView({ orders, onOpen, onStatusChange }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {['OS', 'Cliente', 'Aparelho', 'Problema', 'Entrada', 'Previsão', 'Total', 'Status'].map((h) => (
              <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((o) => (
            <tr key={o.id} onClick={() => onOpen(o)} className="cursor-pointer hover:bg-blue-50/40">
              <td className="px-3 py-2.5 font-bold text-ink-900">#{o.service_order_number}</td>
              <td className="px-3 py-2.5">{o.customer?.name}</td>
              <td className="px-3 py-2.5">{o.device?.brand} {o.device?.model}</td>
              <td className="max-w-56 truncate px-3 py-2.5 text-slate-500">{o.reported_issue}</td>
              <td className="px-3 py-2.5 text-slate-500">{dt(o.created_at)}</td>
              <td className={`px-3 py-2.5 ${isOverdue(o) ? 'font-bold text-red-600' : 'text-slate-500'}`}>{dateOnly(o.estimated_delivery_at)}</td>
              <td className="px-3 py-2.5 font-semibold">{o.grand_total_amount > 0 ? brl(o.grand_total_amount) : '—'}</td>
              <td className="px-3 py-2.5"><StatusSelect order={o} onChange={onStatusChange} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}