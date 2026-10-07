import { createContext, useContext, useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const value = useMemo(() => {
    const push = (type, msg) => {
      const id = Date.now() + Math.random();
      setItems((i) => [...i, { id, type, msg }]);
      setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), 4000);
    };
    return { success: (m) => push('success', m), error: (m) => push('error', m) };
  }, []);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed right-3 top-3 z-[100] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
          >
            {t.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}