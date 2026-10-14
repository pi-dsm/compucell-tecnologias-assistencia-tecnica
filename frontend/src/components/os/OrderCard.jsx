import { CalendarClock, ShieldAlert } from 'lucide-react';
import { brl, dateOnly, DEVICE_TYPES, isOverdue } from '../../utils/format';
import StatusSelect from './StatusSelect';

export default function OrderCard({ order, onOpen, onStatusChange, className = '' }) {
  const overdue = isOverdue(order);
  return (
    <div
      onClick={() => onOpen?.(order)}
      className={`rounded-xl border bg-white p-3.5 shadow-card transition hover:shadow-pop ${overdue ? 'border-red-300' : 'border-slate-200'} ${className}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-base font-extrabold text-ink-900">#{order.service_order_number}</span>
        <StatusSelect order={order} onChange={onStatusChange} />
      </div>
      {order.is_warranty && (
        <span className="mb-1.5 inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700">
          <ShieldAlert size={12} /> Garantia
        </span>
      )}
      <p className="truncate text-sm font-semibold text-slate-800">{order.customer?.name}</p>
      <p className="truncate text-sm text-slate-600">
        {order.device?.brand} {order.device?.model}
        <span className="text-slate-400"> · {DEVICE_TYPES[order.device?.device_type]}</span>
      </p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{order.reported_issue}</p>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1 ${overdue ? 'font-bold text-red-600' : 'text-slate-500'}`}>
          <CalendarClock size={13} /> {dateOnly(order.estimated_delivery_at)}
          {overdue && ' · atrasada'}
        </span>
        <span className="font-bold text-orange-600">{order.grand_total_amount > 0 ? brl(order.grand_total_amount) : ''}</span>
      </div>
    </div>
  );
}