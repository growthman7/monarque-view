import { ScrollTrigger, gsap } from './animationConfig';

/**
 * Visite au scroll : une « caméra » CSS 3D parcourt un plan.
 * Chaque étape = { x, y } (point regardé, en unités du plan), s (zoom), rx (inclinaison du sol, en degrés).
 * Le plan est un calque de taille W×H où 1 unité de plan = k pixels.
 */
export function cameraTransform({ x, y, s, rx }, { W, H, k, boost = 1 }) {
  // boost (petits écrans) n'agit que sur les gros plans : la vue d'ensemble (s = 1) reste entière.
  const zoom = 1 + (s - 1) * boost;
  return `rotateX(${rx}deg) scale(${zoom}) translate(${W / 2 - x * k}px, ${H / 2 - y * k}px)`;
}

/** Point de vue depuis la porte : regard posé un peu à l'intérieur de la salle. */
export function doorView(plan, door) {
  if (!door) return { x: plan.width / 2, y: plan.height * 0.8, s: 2.4, rx: 62 };
  const cx = door.x + door.width / 2;
  const cy = door.y + door.height / 2;
  const inward = cy > plan.height / 2 ? -1 : 1;
  return { x: cx, y: cy + inward * plan.height * 0.12, s: 2.6, rx: 62 };
}

/** Cadre sur une zone rectangulaire, sol encore légèrement incliné. */
export function zoneView(plan, z) {
  const s = Math.min(3, Math.max(1.15, Math.min(plan.width / z.width, plan.height / z.height) * 0.85));
  return { x: z.x + z.width / 2, y: z.y + z.height / 2, s, rx: 38 };
}

export const overview = (plan) => ({ x: plan.width / 2, y: plan.height / 2, s: 1, rx: 0 });

/**
 * Construit la timeline pilotée par le scroll (épinglée). `scenes` = [{ layer, doors, steps:[{ view, reveal?, caption }] }].
 * Renvoie la liste des repères temporels pour synchroniser les légendes.
 */
export function buildWalkthrough({ section, scenes, metrics, onStep }) {
  const marks = [];
  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });

  scenes.forEach((scene, si) => {
    const m = metrics[si];
    const cam = { ...scene.steps[0].view };
    const apply = () => { scene.layer.style.transform = cameraTransform(cam, m); };
    apply();
    gsap.set(scene.layer.parentElement, { autoAlpha: si === 0 ? 1 : 0 });

    if (si > 0) {
      // Les portes se referment sur la scène précédente, on change de lieu, elles se rouvrent.
      tl.to(scene.doors, { xPercent: 0, duration: 0.6, ease: 'power2.in' })
        .set(scenes[si - 1].layer.parentElement, { autoAlpha: 0 })
        .set(scene.layer.parentElement, { autoAlpha: 1 });
    } else {
      gsap.set(scene.doors, { xPercent: 0 });
    }
    marks.push({ t: tl.duration(), step: `${si}:0` });
    tl.to(scene.doors[0], { xPercent: -101, duration: 1.1, ease: 'power3.inOut' })
      .to(scene.doors[1], { xPercent: 101, duration: 1.1, ease: 'power3.inOut' }, '<');

    scene.steps.forEach((st, i) => {
      if (i === 0) return;
      const at = tl.duration() - (i === 1 ? 0.6 : 0);
      tl.to(cam, { ...st.view, duration: 1.5, onUpdate: apply }, at);
      if (st.reveal?.length) {
        // fromTo explicite : l'état final ne dépend jamais d'un rendu précédent resté à mi-chemin.
        tl.fromTo(st.reveal, { opacity: 0.12, scale: 0.6 }, { opacity: 1, scale: 1, transformOrigin: 'center center', transformBox: 'fill-box', duration: 0.6, stagger: { each: 0.02, from: 'center' }, ease: 'back.out(1.6)', immediateRender: true }, at + 0.7);
      }
      marks.push({ t: at + 0.75, step: `${si}:${i}` });
      tl.to({}, { duration: 0.6 }); // temps de lecture sur l'étape
    });
  });

  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${Math.round(tl.duration() * window.innerHeight * 0.4)}`,
    pin: true,
    scrub: 0.8,
    animation: tl,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const t = self.progress * tl.duration();
      let cur = marks[0];
      for (const mk of marks) if (mk.t <= t + 0.01) cur = mk;
      onStep(cur.step, self.progress);
    },
  });
  // L'épinglage ajoute de la hauteur : les déclencheurs situés plus bas doivent être recalculés.
  requestAnimationFrame(() => ScrollTrigger.refresh());
  return () => { st.kill(); tl.kill(); };
}
