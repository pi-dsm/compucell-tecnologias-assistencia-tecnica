import { X } from 'lucide-react';
import { STATUS } from '../utils/format';

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50';
export const btnBlue =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50';

export const Spinner = () => (
  <div className="flex justify-center py-12">
    <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-200 border-t-orange-500" />
  </div>
);

export const StatusBadge = ({ status }) => {
  const s = STATUS[status] || STATUS.received;
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
};

export const Card = ({ title, right, children, className = '' }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
    {(title || right) && (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-blue-900">{title}</h2>
        {right}
      </div>
    )}
    {children}
  </section>
);

export const Field = ({ label, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    {children}
  </label>
);

export const Info = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p className="text-sm text-slate-800">{value || '—'}</p>
  </div>
);

export const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-blue-900">{title}</h3>
        <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100"><X size={20} /></button>
      </div>
      {children}
    </div>
  </div>
);