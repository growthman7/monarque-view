import { DUR, EASE, Flip, gsap } from './animationConfig';

/** Récapitulatif : les lignes ajoutées/retirées glissent à leur place (Flip). */
export function flipSummary(container, mutate) {
  if (!container) { mutate(); return; }
  const state = Flip.getState(container.querySelectorAll('[data-flip]'));
  mutate();
  requestAnimationFrame(() => {
    Flip.from(state, { duration: DUR.short, ease: EASE.out, absolute: false, onEnter: (els) => gsap.from(els, { opacity: 0, x: 16, duration: DUR.short }), onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.15 }) });
  });
}

/** Le total « roule » vers sa nouvelle valeur. */
export function rollNumber(el, from, to, format) {
  if (!el) return;
  const o = { v: from };
  gsap.to(o, { v: to, duration: 0.5, ease: EASE.out, onUpdate: () => { el.textContent = format(o.v); } });
}

/** Billet : impression qui sort de la fente. */
export function printTicket(ticket, { reduced }) {
  if (reduced) return gsap.from(ticket, { opacity: 0, duration: 0.3 });
  return gsap.timeline()
    .from(ticket, { yPercent: -30, clipPath: 'inset(0% 0% 100% 0%)', duration: 1.2, ease: EASE.inOut })
    .from(ticket.querySelectorAll('[data-ticket-line]'), { opacity: 0, y: 10, stagger: 0.05, duration: DUR.short }, '-=0.4');
}
