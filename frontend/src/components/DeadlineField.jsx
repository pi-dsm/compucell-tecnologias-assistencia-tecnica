import { TriangleAlert } from 'lucide-react';
import { dateInputToISO, isoToDateInput } from '../utils/format';
import { inputCls } from './ui';

// Estado do campo: { days: '3', manual: false, date: '' } (modo dias úteis)
//               ou { days: '',  manual: true,  date: 'AAAA-MM-DD' } (data digitada à mão)
export const newDeadline = (days) => ({ days: String(days), manual: false, date: '' });

export const deadlineDate = (value, calendar) =>
  value.manual ? value.date : isoToDateInput(calendar.addBusinessDays(new Date(), Number(value.days) || 0).toISOString());

// name: 'budget' | 'delivery'  ->  budget_business_days  |  estimated_budget_at
export const deadlinePayload = (value, name) =>
  value.manual
    ? { [`estimated_${name}_at`]: dateInputToISO(value.date) }
    : { [`${name}_business_days`]: Number(value.days) || 0 };

export const isDeadlineValid = (value) => (value.manual ? !!value.date : value.days !== '' && Number(value.days) >= 0);

export default function DeadlineField({ label, value, onChange, calendar }) {
  const date = deadlineDate(value, calendar);
  const parsed = date ? new Date(`${date}T12:00:00`) : null;
  const pretty = parsed ? parsed.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) : '—';
  const nonBusiness = value.manual && parsed && !calendar.isBusinessDay(parsed);

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        {!value.manual && (
          <>
            <input
              type="number"
              min="0"
              max="90"
              className={`${inputCls} w-20`}
              value={value.days}
              onChange={(e) => onChange({ ...value, days: e.target.value })}
              aria-label={`${label} em dias úteis`}
            />
            <span className="whitespace-nowrap text-sm text-slate-500">dias úteis</span>
          </>
        )}
        <input
          type="date"
          className={inputCls}
          value={date}
          onChange={(e) => onChange({ days: '', manual: true, date: e.target.value })}
          aria-label={`${label} (data)`}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {value.manual ? (
          <>
            Data digitada à mão.{' '}
            <button type="button" className="font-semibold text-blue-700 underline" onClick={() => onChange(newDeadline(1))}>Voltar para dias úteis</button>
          </>
        ) : (
          <>Previsto para <b className="capitalize">{pretty}</b>.</>
        )}
      </p>
      {nonBusiness && (
        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-700">
          <TriangleAlert size={13} /> Esta data cai em fim de semana ou feriado.
        </p>
      )}
    </div>
  );
}