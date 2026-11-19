import { DUR, EASE, STAGGER, ScrollTrigger, SplitText, gsap } from './animationConfig';

/**
 * Révélations déclaratives :
 *  data-reveal="fade"   → montée + fondu
 *  data-reveal="mask"   → image dévoilée par un masque (clip-path) avec léger dézoom
 *  data-reveal="lines"  → texte découpé en lignes qui montent derrière un masque
 *  data-reveal="stagger"→ enfants directs en cascade
 * Le contenu reste visible par défaut : l'état caché n'est posé qu'au moment de l'animation.
 */
export function revealSections(scope, { reduced }) {
  const q = gsap.utils.selector(scope);

  if (reduced) {
    q('[data-reveal]').forEach((el) => {
      gsap.from(el, { opacity: 0, duration: 0.4, ease: 'none', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    return;
  }

  q('[data-reveal="fade"]').forEach((el) => {
    gsap.from(el, { y: 36, rotationX: -14, transformPerspective: 900, transformOrigin: '50% 100%', opacity: 0, duration: DUR.long, clearProps: 'transform', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  q('[data-reveal="mask"]').forEach((el) => {
    const img = el.querySelector('img');
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    tl.from(el, { clipPath: 'inset(18% 12% 18% 12% round 4px)', rotationX: 10, transformPerspective: 1200, transformOrigin: '50% 100%', duration: DUR.cinematic, ease: EASE.inOut, clearProps: 'transform' });
    if (img) tl.from(img, { scale: 1.25, duration: DUR.cinematic * 1.2, ease: EASE.out }, 0);
  });

  q('[data-reveal="lines"]').forEach((el) => {
    const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    gsap.from(split.lines, {
      yPercent: 110, duration: DUR.long, stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  q('[data-reveal="stagger"]').forEach((el) => {
    gsap.from(el.children, { y: 28, rotationX: -18, z: -60, transformPerspective: 900, transformOrigin: '50% 100%', opacity: 0, duration: DUR.base * 1.4, stagger: STAGGER.items, clearProps: 'transform', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  q('[data-parallax]').forEach((el) => {
    const amount = Number(el.dataset.parallax) || 12;
    gsap.fromTo(el, { yPercent: -amount }, { yPercent: amount, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/** Mot à mot : les mots passent du gris au blanc au rythme du défilement (manifeste). */
export function scrubWords(el) {
  const split = SplitText.create(el, { type: 'words' });
  gsap.fromTo(split.words, { color: '#4a4356' }, {
    color: '#F8F6FA', stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: el, start: 'top 75%', end: 'bottom 45%', scrub: true },
  });
  return split;
}

/** Bandeau défilant dont la vitesse et le sens suivent le scroll. */
export function marquee(track, { speed = 60 } = {}) {
  const width = track.scrollWidth / 2;
  const tween = gsap.to(track, { x: -width, duration: width / speed, ease: 'none', repeat: -1 });
  const st = ScrollTrigger.create({
    trigger: track, start: 'top bottom', end: 'bottom top',
    onUpdate: (self) => {
      const v = gsap.utils.clamp(-4, 4, self.getVelocity() / 300);
      gsap.to(tween, { timeScale: v === 0 ? 1 : v, duration: 0.4, overwrite: true });
      gsap.to(tween, { timeScale: self.direction, duration: 1.2, delay: 0.4 });
    },
  });
  return () => { tween.kill(); st.kill(); };
}

/** Transition d'univers : un aplat de couleur balaie la section en entrant (référence vidéo). */
export function colorWipe(section, panel) {
  gsap.fromTo(panel, { clipPath: 'inset(100% 0% 0% 0%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
    scrollTrigger: { trigger: section, start: 'top 85%', end: 'top 15%', scrub: 0.6 },
  });
}
