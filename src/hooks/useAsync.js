import { useCallback, useEffect, useRef, useState } from 'react';

/** Chargement asynchrone avec états loading / error / data et rechargement manuel. */
export function useAsync(fn, deps = [], { keepPrevious = true } = {}) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const seq = useRef(0);
  const run = useCallback(async (silent = false) => {
    const id = ++seq.current;
    if (!silent) setState((s) => ({ loading: true, error: null, data: keepPrevious ? s.data : null }));
    try {
      const data = await fn();
      if (id === seq.current) setState({ loading: false, error: null, data });
      return data;
    } catch (error) {
      if (id === seq.current) setState((s) => ({ loading: false, error, data: s.data }));
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
}
