import { DUR, EASE, gsap, prefersReducedMotion } from './animationConfig';

/** Bouton magnétique (pointeur fin uniquement) : suit légèrement le curseur, revient sans rebond. */
export function magnetic(el, strength = 0.25) {
  if (!el || prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return () => {};
  const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: EASE.out });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: EASE.out });
  const move = (e) => {
    const r = el.getBoundingClientRect();
    xTo((e.clientX - (r.left + r.width / 2)) * strength);
    yTo((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const leave = () => { xTo(0); yTo(0); };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  return () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
  };
}

/** Image flottante qui suit le curseur au survol d'une liste (menu des restaurants). */
export function followCursor(el) {
  const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: EASE.out });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: EASE.out });
  return (e) => { xTo(e.clientX); yTo(e.clientY); };
}

export function showFloating(el, visible) {
  gsap.to(el, { opacity: visible ? 1 : 0, scale: visible ? 1 : 0.85, duration: DUR.short, ease: EASE.out, overwrite: 'auto' });
}

/** Ouverture d'un menu / d'une modale depuis son déclencheur. */
export function openSurface(el, { origin = 'top right' } = {}) {
  if (prefersReducedMotion()) return gsap.from(el, { opacity: 0, duration: 0.15 });
  return gsap.from(el, { opacity: 0, scale: 0.96, y: -6, transformOrigin: origin, filter: 'blur(6px)', duration: DUR.short, ease: EASE.out, clearProps: 'filter,transform' });
}

export function toastIn(el) {
  if (prefersReducedMotion()) return gsap.from(el, { opacity: 0, duration: 0.15 });
  return gsap.from(el, { y: 24, opacity: 0, duration: DUR.short, ease: EASE.out });
}

export function shake(el) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
}

/**
 * Inclinaison 3D au survol pour tout élément [data-tilt] (valeur = angle max, 8° par défaut).
 * Un seul écouteur délégué pour tout le site ; uniquement transform (compositeur), souris uniquement.
 */
export function initTilt() {
  if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return () => {};
  const setters = new WeakMap();
  let active = null;
  let rect = null; // mesuré à l'entrée : le relire pendant l'inclinaison ferait trembler l'effet
  const get = (el) => {
    if (!setters.has(el)) {
      gsap.set(el, { transformPerspective: 900, transformStyle: 'preserve-3d' });
      setters.set(el, {
        rx: gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: EASE.out }),
        ry: gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: EASE.out }),
        z: gsap.quickTo(el, 'z', { duration: 0.6, ease: EASE.out }),
      });
    }
    return setters.get(el);
  };
  const release = (el) => { const s = get(el); s.rx(0); s.ry(0); s.z(0); el.style.willChange = ''; };
  const move = (e) => {
    const el = e.target.closest?.('[data-tilt]');
    if (el !== active) { if (active) release(active); active = el; if (el) { el.style.willChange = 'transform'; rect = el.getBoundingClientRect(); gsap.set(el, { transformPerspective: 900 }); } } // perspective reposée à chaque entrée : une révélation au scroll a pu l'effacer
    if (!el) return;
    const r = rect;
    const max = Number(el.dataset.tilt) || 8;
    const s = get(el);
    s.ry(((e.clientX - r.left) / r.width - 0.5) * max * 2);
    s.rx(-((e.clientY - r.top) / r.height - 0.5) * max * 2);
    s.z(24);
  };
  const leave = () => { if (active) { release(active); active = null; } };
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerleave', leave);
  return () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); };
}
