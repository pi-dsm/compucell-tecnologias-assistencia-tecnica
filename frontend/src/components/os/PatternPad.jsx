import { Eraser } from 'lucide-react';

// Padrão de desbloqueio 3x3. Os pontos são numerados na ordem em que foram tocados.
export default function PatternPad({ value = [], onChange, readOnly = false }) {
  const toggle = (p) => {
    if (readOnly) return;
    onChange(value.includes(p) ? value.filter((v) => v !== p) : [...value, p]);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="inline-grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        {Array.from({ length: 9 }, (_, p) => {
          const order = value.indexOf(p);
          const selected = order !== -1;
          return (
            <button
              type="button"
              key={p}
              disabled={readOnly}
              onClick={() => toggle(p)}
              aria-label={`Ponto ${p + 1}`}
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                selected ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300 bg-white text-transparent'
              }`}
            >
              {selected ? order + 1 : ''}
            </button>
          );
        })}
      </div>
      {!readOnly && (
        <button type="button" onClick={() => onChange([])} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600">
          <Eraser size={14} /> Limpar padrão
        </button>
      )}
    </div>
  );
}