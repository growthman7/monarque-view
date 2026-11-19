import { DUR, EASE, gsap, prefersReducedMotion } from './animationConfig';

/**
 * Transition de page : un volet violet sombre traverse l'écran (rideau qui tombe puis remonte).
 * Courte (≈ 0,7 s au total), ne bloque jamais la navigation : la nouvelle route est déjà montée
 * pendant que le volet se retire.
 */
export function coverPage(curtain) {
  if (prefersReducedMotion()) return gsap.to(curtain, { opacity: 0, duration: 0.01 });
  return gsap.timeline()
    .set(curtain, { display: 'block', yPercent: 100, opacity: 1 })
    .to(curtain, { yPercent: 0, duration: DUR.short, ease: EASE.inOut });
}

export function revealPage(curtain, page) {
  const reduced = prefersReducedMotion();
  const tl = gsap.timeline();
  if (reduced) {
    tl.set(curtain, { display: 'none' }).from(page, { opacity: 0, duration: 0.25, ease: 'none' });
    return tl;
  }
  tl.to(curtain, { yPercent: -100, duration: DUR.base, ease: EASE.inOut })
    .set(curtain, { display: 'none' })
    .from(page, { y: 40, opacity: 0, duration: DUR.base, ease: EASE.out, clearProps: 'transform,opacity' }, 0.1);
  return tl;
}

/** Changement d'étape dans un parcours de réservation : glisse horizontale courte. */
export function stepTransition(el, direction = 1) {
  // fromTo explicite : l'état final ne dépend jamais d'une valeur lue en cours de transition CSS.
  if (prefersReducedMotion()) return gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2, clearProps: 'opacity' });
  return gsap.fromTo(el, { x: 40 * direction, opacity: 0 }, { x: 0, opacity: 1, duration: DUR.base, ease: EASE.out, clearProps: 'transform,opacity' });
}
