import { DUR, EASE, gsap } from './animationConfig';

/** Le plan de salle apparaît : l'écran s'allume, puis les rangées montent depuis le fond. */
export function revealHall(svg, { reduced }) {
  const screen = svg.querySelector('[data-screen]');
  const rows = [...svg.querySelectorAll('[data-row]')];
  if (reduced) return gsap.from(svg, { opacity: 0, duration: 0.3 });
  const tl = gsap.timeline();
  if (screen) tl.from(screen, { opacity: 0, scaleX: 0.6, transformOrigin: '50% 50%', duration: DUR.long });
  tl.from(rows, { opacity: 0, y: 30, duration: DUR.base, stagger: 0.05 }, 0.2);
  return tl;
}

/** Sélection d'un siège : pression puis halo bref. L'état réel vient des données, jamais de l'animation. */
export function pulseSeat(node, selected) {
  if (!node) return;
  gsap.fromTo(node, { scale: selected ? 0.8 : 1.1 }, { scale: 1, duration: 0.5, ease: selected ? 'back.out(2.2)' : EASE.out, transformOrigin: '50% 50%', clearProps: 'transform' });
}

/** Mise en avant d'une catégorie : les autres sièges s'estompent. */
export function focusCategory(svg, category) {
  const seats = svg.querySelectorAll('[data-seat]');
  gsap.to(seats, {
    opacity: (i, el) => (!category || el.dataset.category === category ? 1 : 0.22),
    duration: DUR.short, ease: EASE.out, overwrite: 'auto',
  });
}
