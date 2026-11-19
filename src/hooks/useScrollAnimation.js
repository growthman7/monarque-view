import { useEffect } from 'react';
import { ScrollTrigger } from '../animations/animationConfig';
import { useGsap } from './useGsap';
import { revealSections } from '../animations/scrollAnimations';

/**
 * Révélations au scroll pour tout élément [data-reveal] du composant.
 * Rafraîchit ScrollTrigger quand les images finissent de charger ou que l'écran change de taille.
 */
export function useScrollAnimation(deps = [], scopeRef) {
  const scope = useGsap(({ reduced, scope: el }) => revealSections(el, { reduced }), deps, scopeRef);

  useEffect(() => {
    const el = scope.current;
    if (!el) return undefined;
    let t;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(() => ScrollTrigger.refresh(), 120);
    };
    const imgs = [...el.querySelectorAll('img')].filter((i) => !i.complete);
    imgs.forEach((i) => i.addEventListener('load', refresh, { once: true }));
    const ro = new ResizeObserver(refresh);
    ro.observe(el);
    return () => {
      clearTimeout(t);
      ro.disconnect();
      imgs.forEach((i) => i.removeEventListener('load', refresh));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return scope;
}
