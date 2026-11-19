import { DUR, EASE, gsap } from './animationConfig';

/**
 * « Entrer dans le restaurant » : la caméra (viewBox) part de la porte d'entrée, en gros plan,
 * puis recule jusqu'au plan complet pendant que les zones et les tables se révèlent.
 */
export function enterRestaurant({ camera, setView, from, to, zones, tables }, { reduced }) {
  if (reduced) {
    setView(to);
    return gsap.from([...zones, ...tables], { opacity: 0, duration: 0.3 });
  }
  const state = { ...from };
  const tl = gsap.timeline();
  tl.to(state, {
    x: to.x, y: to.y, w: to.w, h: to.h, duration: 1.8, ease: EASE.inOut,
    onUpdate: () => setView({ ...state }),
  }, 0.2)
    .from(zones, { opacity: 0, duration: DUR.long, stagger: 0.12 }, 0.4)
    .from(tables, { opacity: 0, scale: 0.6, transformOrigin: 'center center', transformBox: 'fill-box', duration: DUR.base, stagger: { each: 0.015, from: 'random' } }, 0.8);
  if (camera) camera.current = tl;
  return tl;
}

/** Vol de caméra vers une zone (navigation entre zones). */
export function flyTo(current, target, setView, { reduced } = {}) {
  if (reduced) { setView(target); return null; }
  const state = { ...current };
  return gsap.to(state, { ...target, duration: 0.9, ease: EASE.inOut, onUpdate: () => setView({ ...state }) });
}

export function pulseTable(node) {
  if (!node) return;
  gsap.fromTo(node, { scale: 0.9 }, { scale: 1, duration: 0.55, ease: 'back.out(2)', transformOrigin: 'center center', transformBox: 'fill-box' });
}

/** Panneau d'informations : glisse depuis le bord où il revient (cohérence spatiale). */
export function slidePanel(panel, { reduced, fromRight = true }) {
  if (!panel) return null;
  if (reduced) return gsap.from(panel, { opacity: 0, duration: 0.2 });
  return gsap.from(panel, { x: fromRight ? 48 : 0, y: fromRight ? 0 : 48, opacity: 0, duration: DUR.base, ease: EASE.out, clearProps: 'transform,opacity' });
}
