import { useEffect, useRef } from 'react';
import { notificationService } from '../services';

/**
 * Rafraîchit une vue quand les disponibilités changent : notification (autres onglets / serveur)
 * + interrogation périodique de secours. En production : WebSocket ou SSE sur le même callback.
 */
export function useLiveRefresh(callback, { interval = 10000, enabled = true } = {}) {
  const cb = useRef(callback);
  cb.current = callback;
  useEffect(() => {
    if (!enabled) return undefined;
    const off = notificationService.subscribe((e) => { if (e?.scope !== 'auth') cb.current(); });
    const t = setInterval(() => { if (document.visibilityState === 'visible') cb.current(); }, interval);
    return () => { off(); clearInterval(t); };
  }, [interval, enabled]);
}
