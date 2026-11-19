import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { toastIn } from '../animations/interactionAnimations';

const ToastContext = createContext(null);

function ToastItem({ t, onClose }) {
  const ref = useRef(null);
  useLayoutEffect(() => { const tw = toastIn(ref.current); return () => tw?.kill(); }, []);
  const Icon = t.type === 'success' ? CheckCircle2 : t.type === 'error' ? AlertTriangle : Info;
  const color = t.type === 'success' ? 'text-ok' : t.type === 'error' ? 'text-danger' : 'text-violet-hi';
  return (
    <div ref={ref} role={t.type === 'error' ? 'alert' : 'status'} className="glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[4px] border border-line bg-ink-2/90 p-4 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl">
      <Icon className={`mt-0.5 size-5 shrink-0 ${color}`} aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        {t.title && <p className="font-semibold text-paper">{t.title}</p>}
        {t.message && <p className="mt-0.5 text-mist">{t.message}</p>}
      </div>
      <button type="button" onClick={onClose} className="rounded-full p-1 text-mist hover:text-paper" aria-label="Fermer la notification"><X className="size-4" /></button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id) => setToasts((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((type, title, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((l) => [...l.slice(-3), { id, type, title, message }]);
    setTimeout(() => remove(id), type === 'error' ? 7000 : 4500);
  }, [remove]);
  const api = useRef({
    success: (title, message) => push('success', title, message),
    error: (title, message) => push('error', title, message),
    info: (title, message) => push('info', title, message),
  });
  api.current.success = (title, message) => push('success', title, message);
  api.current.error = (title, message) => push('error', title, message);
  api.current.info = (title, message) => push('info', title, message);
  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6">
        {toasts.map((t) => <ToastItem key={t.id} t={t} onClose={() => remove(t.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
