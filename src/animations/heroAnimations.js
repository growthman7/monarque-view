import { DUR, EASE, STAGGER, ScrollTrigger, SplitText, gsap, isLowPower } from './animationConfig';

/**
 * Entrée du hero : le rideau de velours s'entrouvre, le mot MONARQUE monte lettre à lettre,
 * le faisceau du projecteur s'allume. Puis, au scroll, le rideau s'ouvre complètement et
 * la scène recule (profondeur) pendant que le mot s'efface.
 */
export function heroIntro(refs, { reduced }) {
  const { root, word, curtainL, curtainR, photo, beam, sub, ctas, nav } = refs;
  if (reduced) {
    gsap.set(root, { autoAlpha: 1 });
    gsap.from([word, sub, ctas], { opacity: 0, duration: 0.5, stagger: 0.1, ease: 'none' });
    gsap.set([curtainL], { xPercent: -62 });
    gsap.set([curtainR], { xPercent: 62 });
    return null;
  }

  const split = SplitText.create(word, { type: 'chars', mask: 'chars' });
  const subSplit = SplitText.create(sub, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
  const tl = gsap.timeline({ defaults: { ease: EASE.out } });

  tl.set(root, { autoAlpha: 1 })
    .from(photo, { scale: 1.35, filter: 'brightness(0.2)', duration: DUR.cinematic * 1.4, ease: EASE.out }, 0)
    .fromTo(curtainL, { xPercent: 0 }, { xPercent: -62, duration: DUR.cinematic, ease: EASE.inOut }, 0.15)
    .fromTo(curtainR, { xPercent: 0 }, { xPercent: 62, duration: DUR.cinematic, ease: EASE.inOut }, 0.15)
    .from(beam, { opacity: 0, scaleY: 0.4, transformOrigin: '50% 0%', duration: DUR.cinematic }, 0.6)
    .from(split.chars, { yPercent: 115, duration: DUR.long * 1.1, stagger: STAGGER.chars * 2 }, 0.55)
    .from(subSplit.lines, { yPercent: 110, duration: DUR.long, stagger: 0.1 }, 1.0)
    .from(ctas.children, { y: 24, opacity: 0, duration: DUR.base, stagger: 0.08 }, 1.2);
  if (nav) tl.from(nav, { yPercent: -100, opacity: 0, duration: DUR.long }, 0.9);

  // Scroll : ouverture complète + recul de la scène
  if (!isLowPower()) {
    gsap.timeline({ scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.8 } })
      .to(curtainL, { xPercent: -100, ease: 'none' }, 0)
      .to(curtainR, { xPercent: 100, ease: 'none' }, 0)
      .to(word, { yPercent: -35, scale: 0.92, opacity: 0.15, ease: 'none' }, 0)
      .to(photo, { scale: 1.12, yPercent: 8, ease: 'none' }, 0)
      .to(beam, { opacity: 0, ease: 'none' }, 0);
  }
  return () => ScrollTrigger.refresh();
}

/** Portails cinéma / restaurant : la moitié survolée s'élargit, l'autre recule. */
export function portalHover(container) {
  const panels = gsap.utils.toArray(container.children);
  const enter = (p) => {
    panels.forEach((x) => gsap.to(x, { flexGrow: x === p ? 1.6 : 0.8, duration: DUR.long, ease: EASE.out, overwrite: 'auto' }));
    gsap.to(p.querySelector('img'), { scale: 1.06, duration: DUR.cinematic, overwrite: 'auto' });
  };
  const leave = () => {
    panels.forEach((x) => {
      gsap.to(x, { flexGrow: 1, duration: DUR.long, overwrite: 'auto' });
      gsap.to(x.querySelector('img'), { scale: 1, duration: DUR.cinematic, overwrite: 'auto' });
    });
  };
  const handlers = panels.map((p) => {
    const h = () => enter(p);
    p.addEventListener('pointerenter', h);
    return [p, h];
  });
  container.addEventListener('pointerleave', leave);
  return () => {
    handlers.forEach(([p, h]) => p.removeEventListener('pointerenter', h));
    container.removeEventListener('pointerleave', leave);
  };
}
