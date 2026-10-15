import { AlertTriangle, X } from 'lucide-react';
import { PAYMENT_STATE, STATUS } from '../utils/format';

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-hidden focus:ring-3 focus:ring-blue-500/20 disabled:bg-slate-100';

const btn =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-card transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
export const btnPrimary = `${btn} bg-orange-500 text-white hover:bg-orange-600 focus-visible:outline-orange-500`;
export const btnBlue = `${btn} bg-blue-700 text-white hover:bg-blue-800 focus-visible:outline-blue-700`;
export const btnGhost = `${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-400`;
export const btnDanger = `${btn} bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600`;
// Modificador de tamanho: use junto de um botão (ex.: `${btnGhost} ${btnSm}`). Em Tailwind 4 o "important" é sufixo (`!`).
export const btnSm = 'px-3! py-1.5! text-xs!';

export const Spinner = () => (
  <div className="flex justify-center py-12" role="status" aria-label="Carregando">
    <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-orange-500" />
  </div>
);

export const StatusBadge = ({ status }) => {
  const s = STATUS[status] || STATUS.received;
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.cls}`}>{s.label}</span>;
};

export const PaymentBadge = ({ state }) => {
  const s = PAYMENT_STATE[state] || PAYMENT_STATE.unpaid;
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.cls}`}>{s.label}</span>;
};

export const Card = ({ title, right, children, className = '' }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5 ${className}`}>
    {(title || right) && (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
        {right}
      </div>
    )}
    {children}
  </section>
);

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);

export const EmptyState = ({ children }) => (
  <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{children}</p>
);

export const Field = ({ label, children, className = '', hint }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
  </label>
);

export const Info = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p className="text-sm text-slate-800">{value || '—'}</p>
  </div>
);

const SIZES = { md: 'max-w-2xl', lg: 'max-w-3xl', xl: 'max-w-5xl', sm: 'max-w-md' };

export const Modal = ({ title, onClose, children, size = 'md' }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
    <div
      role="dialog"
      aria-modal="true"
      className={`max-h-[92vh] w-full ${SIZES[size] || SIZES.md} overflow-y-auto rounded-t-2xl bg-white p-5 shadow-pop sm:rounded-2xl`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-ink-900">{title}</h3>
        <button onClick={onClose} className="rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="Fechar"><X size={20} /></button>
      </div>
      {children}
    </div>
  </div>
);

export const ConfirmModal = ({ title, message, confirmLabel = 'Confirmar', danger = false, busy = false, onConfirm, onClose }) => (
  <Modal title={title} onClose={onClose} size="sm">
    <div className="flex gap-3">
      <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" />
      <p className="text-sm text-slate-600">{message}</p>
    </div>
    <div className="mt-5 flex justify-end gap-2">
      <button className={btnGhost} onClick={onClose}>Voltar</button>
      <button className={danger ? btnDanger : btnPrimary} onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
    </div>
  </Modal>
);