import { OPEN_STATUSES, STATUS } from '../../utils/format';
import { StatusBadge } from '../ui';

// Edição rápida de status. OS finalizadas mostram apenas o selo.
export default function StatusSelect({ order, onChange, className = '' }) {
  if (!OPEN_STATUSES.includes(order.status)) return <StatusBadge status={order.status} />;
  const options = [...OPEN_STATUSES, 'delivered', 'cancelled'];
  return (
    <select
      value={order.status}
      aria-label="Alterar status"
      onChange={(e) => onChange(order, e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()} // não inicia o arraste ao usar o select
      className={`rounded-full border-0 py-0.5 pl-2.5 pr-7 text-xs font-semibold ring-1 ring-inset focus:outline-hidden focus:ring-2 ${STATUS[order.status].cls} ${className}`}
    >
      {options.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
    </select>
  );
}