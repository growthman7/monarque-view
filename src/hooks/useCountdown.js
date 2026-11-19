import { useEffect, useState } from 'react';

/** Secondes restantes jusqu'à une échéance ISO ; 0 quand dépassée. */
export function useCountdown(deadline) {
  const calc = () => (deadline ? Math.max(0, Math.round((new Date(deadline).getTime() - Date.now()) / 1000)) : 0);
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    if (!deadline) return undefined;
    const t = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);
  return left;
}

export const formatClock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
