import { useLayoutEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '../animations/animationConfig';

/**
 * Exécute des animations GSAP dans un gsap.context() limité au composant (scope),
 * puis les annule proprement (revert) au démontage ou quand les dépendances changent.
 * Le callback reçoit { reduced, context } ; une erreur d'animation ne casse jamais le rendu.
 */
export function useGsap(callback, deps = [], scopeRef) {
  const localRef = useRef(null);
  const scope = scopeRef || localRef;
  useLayoutEffect(() => {
    if (!scope.current) return undefined;
    const reduced = prefersReducedMotion();
    const ctx = gsap.context((self) => {
      try {
        callback({ reduced, context: self, scope: scope.current });
      } catch (err) {
        console.warn('[animation] ignorée :', err);
        gsap.set(scope.current.querySelectorAll('[data-anim]'), { clearProps: 'all' });
      }
    }, scope);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return scope;
}
