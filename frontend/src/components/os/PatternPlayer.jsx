import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { btnGhost, btnSm } from '../ui';

const SEGMENT_MS = 450;
const point = (i) => ({ x: 40 + (i % 3) * 60, y: 40 + Math.floor(i / 3) * 60 });

export const patternLabel = (pattern = []) => pattern.map((n) => (n != null ? n + 1 : '')).filter(Boolean).join('-');

export default function PatternPlayer({ pattern = [], autoPlay = true }) {
  const validPattern = useMemo(() => {
    return Array.isArray(pattern) ? pattern.filter((n) => typeof n === 'number' && !isNaN(n) && n >= 0 && n < 9) : [];
  }, [pattern]);
  
  const last = Math.max(validPattern.length - 1, 0);
  const sequence = patternLabel(validPattern);
  const [t, setT] = useState(autoPlay ? 0 : last);
  const [playing, setPlaying] = useState(false);
  const frame = useRef(0);

  const play = useCallback(() => {
    cancelAnimationFrame(frame.current);
    if (validPattern.length < 2) return;
    const start = performance.now();
    setPlaying(true);
    setT(0);
    const tick = (now) => {
      const value = Math.min((now - start) / SEGMENT_MS, last);
      setT(value);
      if (value < last) {
        frame.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
      }
    };
    frame.current = requestAnimationFrame(tick);
  }, [validPattern, last]);

  useEffect(() => {
    if (autoPlay && validPattern.length >= 2) {
      play();
    } else {
      setT(last);
    }
    return () => cancelAnimationFrame(frame.current);
  }, [validPattern, autoPlay, play, last]);

  const pts = useMemo(() => validPattern.map((n) => point(n)), [validPattern]);
  const idx = Math.min(Math.floor(t), Math.max(pts.length - 2, 0));
  const frac = t - idx;

  const finger =
    pts.length === 0 || !pts[idx]
      ? null
      : idx >= last || !pts[idx + 1]
      ? pts[last]
      : { 
          x: pts[idx].x + (pts[idx + 1].x - pts[idx].x) * frac, 
          y: pts[idx].y + (pts[idx + 1].y - pts[idx].y) * frac 
        };

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <svg viewBox="0 0 200 200" className="h-48 w-48 rounded-xl border border-slate-200 bg-slate-50" role="img" aria-label={`Padrão de desbloqueio: ${sequence}`}>
        {Array.from({ length: 9 }, (_, i) => {
          const p = point(i);
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="12" fill="#e2e8f0" />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fill="#94a3b8">{i + 1}</text>
            </g>
          );
        })}
        {pts.slice(0, -1).map((a, i) => {
          const b = pts[i + 1];
          if (!a || !b) return null;
          const f = Math.min(Math.max(t - i, 0), 1);
          if (f <= 0) return null;
          return <line key={i} x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * f} y2={a.y + (b.y - a.y) * f} stroke="#f97316" strokeWidth="6" strokeLinecap="round" />;
        })}
        {pts.map((p, i) =>
          p && t >= i - 0.001 ? (
            <g key={`on-${i}`}>
              <circle cx={p.x} cy={p.y} r="14" fill="#f97316" />
              <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">{validPattern[i] + 1}</text>
            </g>
          ) : null
        )}
        {finger && playing && <circle cx={finger.x} cy={finger.y} r="19" fill="none" stroke="#1d4ed8" strokeWidth="3" />}
      </svg>
      <div className="flex w-48 items-center justify-between gap-2">
        <span className="font-mono text-sm font-bold text-ink-900">{sequence || '—'}</span>
        <button type="button" className={`${btnGhost} ${btnSm}`} onClick={play} disabled={playing || validPattern.length < 2}>
          <RotateCcw size={13} /> Reexibir animação
        </button>
      </div>
    </div>
  );
}