import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { restaurantService, seatService, sessionService, tableService } from '../../services';
import { TABLE_STYLE, TableShape, StaticElement } from '../floor-plan/RestaurantFloor';
import { SeatShape, seatVisual } from '../floor-plan/SeatMap';
import { PlanDefs } from '../floor-plan/PlanControls';
import { buildWalkthrough, cameraTransform, doorView, overview, zoneView } from '../../animations/walkthroughAnimations';
import { gsap, prefersReducedMotion, setMotionChoice } from '../../animations/animationConfig';
import { addDays, formatTime, toDateKey } from '../../utils/format';

const BOOKED = new Set(['occupied', 'locked']);

/** Disponibilités réelles (serveur de démo ou API) : un restaurant ce soir, et la prochaine séance. */
async function loadScenes() {
  const restaurants = await restaurantService.list();
  const pick = restaurants.find((r) => r.id === 'r_1') || restaurants[0];
  const rest = await restaurantService.get(pick.id);
  let avail = null;
  let date = null;
  for (let d = 0; d < 4 && !avail; d += 1) {
    date = toDateKey(addDays(new Date(), d));
    const a = await tableService.availability(rest.id, { date, party: 2 });
    if (a.open) {
      const time = a.slots.find((t) => t >= '20:00') || a.slots[a.slots.length - 1];
      avail = await tableService.availability(rest.id, { date, time, party: 2 });
    }
  }
  const sessions = await sessionService.list({ from: new Date().toISOString() });
  const s = sessions.find((x) => x.hallId === 'h_1') || sessions[0];
  const session = s ? await sessionService.get(s.id) : null;
  const seats = session ? await seatService.availability(session.id) : null;
  return { rest, avail, date, session, seats: seats && { occupied: new Set(seats.occupied), locked: new Set(seats.locked) } };
}

function Stat({ swatch, children }) {
  return <span className="flex items-center gap-2"><svg viewBox="0 0 20 20" className="size-4 shrink-0" aria-hidden>{swatch}</svg>{children}</span>;
}
const FREE_SWATCH = <circle cx="10" cy="10" r="7" fill="#1b1b1e" stroke="#c9a46a" strokeWidth="1.8" />;
const BOOKED_SWATCH = <><circle cx="10" cy="10" r="7" fill="#121214" stroke="#2c2c30" strokeWidth="1.5" /><path d="M6 6l8 8M14 6l-8 8" stroke="#5d5d63" strokeWidth="1.5" /></>;

function RestaurantScene({ rest, avail, tableRefs }) {
  const plan = rest.plan;
  const zones = plan.elements.filter((e) => e.type === 'zone');
  return (
    <svg viewBox={`0 0 ${plan.width} ${plan.height}`} className="h-full w-full" aria-hidden>
      <PlanDefs />
      <rect width={plan.width} height={plan.height} fill="#0f0f11" />
      {zones.map((z) => (
        <g key={z.id}>
          <rect x={z.x} y={z.y} width={z.width} height={z.height} rx="14" fill={z.properties?.color} fillOpacity="0.08" stroke={z.properties?.color} strokeOpacity="0.45" strokeDasharray={z.properties?.outdoor ? '8 6' : undefined} />
          <text x={z.x + 16} y={z.y + z.height - 14} fill="#c9a46a" fontSize="16" fontStyle="italic" fontFamily="Bodoni Moda">{z.label}</text>
        </g>
      ))}
      {plan.elements.filter((e) => ['wall', 'door', 'decor', 'label'].includes(e.type)).map((e) => <StaticElement key={e.id} e={e} />)}
      {plan.elements.filter((e) => e.type === 'table').map((t) => {
        const st = avail?.tables?.[t.id] || 'disabled';
        const booked = BOOKED.has(st);
        const free = st === 'available';
        const style = free ? { ...TABLE_STYLE.available, stroke: '#c9a46a', chair: '#c9a46a' } : booked ? TABLE_STYLE.occupied : TABLE_STYLE.too_small;
        return (
          <g key={t.id} transform={`translate(${t.x} ${t.y}) rotate(${t.rotation || 0} ${t.width / 2} ${t.height / 2})`}>
            <g ref={(n) => { tableRefs.current[t.id] = n; }} data-zone={t.properties?.zoneId}>
              {free && <ellipse cx={t.width / 2} cy={t.height / 2} rx={t.width / 2 + 18} ry={t.height / 2 + 18} fill="#c9a46a" opacity="0.1" />}
              <TableShape t={t} style={style} />
              {booked && <path d={`M4 4 L${t.width - 4} ${t.height - 4} M${t.width - 4} 4 L4 ${t.height - 4}`} stroke="#4a4a50" strokeWidth="2" strokeLinecap="round" />}
            </g>
          </g>
        );
      })}
    </svg>
  );
}

function CinemaScene({ session, seats, seatRefs }) {
  const plan = session.plan;
  const screen = plan.elements.find((e) => e.type === 'screen');
  return (
    <svg viewBox={`0 0 ${plan.width} ${plan.height}`} className="h-full w-full" aria-hidden>
      <PlanDefs />
      <rect width={plan.width} height={plan.height} fill="#0f0f11" />
      {screen && (
        <g>
          <path d={`M${screen.x} ${screen.y + screen.height} Q ${screen.x + screen.width / 2} ${screen.y + screen.height + 120} ${screen.x + screen.width} ${screen.y + screen.height} L ${screen.x + screen.width - 40} ${screen.y + 160} Q ${screen.x + screen.width / 2} ${screen.y + 240} ${screen.x + 40} ${screen.y + 160} Z`} fill="url(#screenGlow)" opacity="0.45" />
          <path d={`M${screen.x} ${screen.y + screen.height} Q ${screen.x + screen.width / 2} ${screen.y - 24} ${screen.x + screen.width} ${screen.y + screen.height}`} fill="none" stroke="#f6f3ee" strokeWidth="5" strokeLinecap="round" filter="url(#glow)" />
        </g>
      )}
      {plan.elements.filter((e) => e.type === 'door').map((e) => <StaticElement key={e.id} e={e} />)}
      {plan.elements.filter((e) => e.type === 'seat').map((s) => {
        const st = s.status !== 'active' ? 'disabled' : seats.occupied.has(s.id) ? 'occupied' : seats.locked.has(s.id) ? 'locked' : 'available';
        const v = st === 'available' ? { fill: 'rgb(201 164 106 / 0.14)', stroke: '#c9a46a' } : seatVisual(s, st);
        return (
          <g key={s.id} transform={`translate(${s.x} ${s.y})`}>
            <g ref={(n) => { seatRefs.current[s.id] = n; }} data-row={s.properties?.row}><SeatShape w={s.width} h={s.height} {...v} /></g>
          </g>
        );
      })}
    </svg>
  );
}

export default function Walkthrough() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState('0:0');
  const [progress, setProgress] = useState(0);
  const [size, setSize] = useState(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const section = useRef(null);
  const stage = useRef(null);
  const layers = [useRef(null), useRef(null)];
  const doors = [useRef(null), useRef(null)];
  const tableRefs = useRef({});
  const seatRefs = useRef({});
  const stepRef = useRef(step);

  useEffect(() => { loadScenes().then(setData).catch(() => setFailed(true)); }, []);

  // Taille de la scène = fenêtre moins la barre de navigation. Mesurée sur la fenêtre (et non par
  // ResizeObserver) : l'épinglage modifie légèrement la boîte et reconstruirait la timeline en plein scroll.
  useLayoutEffect(() => {
    let t;
    const measure = () => {
      const w = window.innerWidth;
      const h = window.innerHeight - 76;
      setSize((s) => (s && Math.abs(s.w - w) < 40 && Math.abs(s.h - h) < 80 ? s : { w, h }));
    };
    measure();
    const onResize = () => { clearTimeout(t); t = setTimeout(measure, 250); };
    window.addEventListener('resize', onResize);
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize); };
  }, []);

  // Étapes de la visite, calculées à partir des vrais plans
  const scenes = useMemo(() => {
    if (!data) return null;
    const { rest, avail, session, seats } = data;
    const rPlan = rest.plan;
    const door = rPlan.elements.find((e) => e.type === 'door');
    const tables = rPlan.elements.filter((e) => e.type === 'table');
    const count = (list) => ({ free: list.filter((t) => avail?.tables?.[t.id] === 'available').length, booked: list.filter((t) => BOOKED.has(avail?.tables?.[t.id])).length });
    const dc = door ? { x: door.x, y: door.y } : { x: rPlan.width / 2, y: rPlan.height };
    const zones = rPlan.elements.filter((e) => e.type === 'zone').sort((a, b) => Math.hypot(a.x + a.width / 2 - dc.x, a.y + a.height / 2 - dc.y) - Math.hypot(b.x + b.width / 2 - dc.x, b.y + b.height / 2 - dc.y));
    const restaurant = {
      plan: rPlan,
      steps: [
        { view: doorView(rPlan, door), title: `On pousse la porte du ${rest.name.replace(/^Le /, '')}`, kicker: rest.name, text: `Ce soir à ${avail?.time?.replace(':', ' h ') || '20 h'}, pour deux. Les tables cerclées d’or sont libres, les tables barrées sont déjà réservées.`, stats: count(tables) },
        ...zones.map((z) => ({ view: zoneView(rPlan, z), zoneId: z.id, title: z.label, kicker: rest.name, text: z.properties?.outdoor ? 'À l’air libre, au bord du soir.' : z.properties?.vip ? 'Banquettes de velours, service dédié. Un acompte confirme la table.' : z.properties?.private ? 'Une pièce fermée pour les grandes tablées.' : 'Le cœur de la maison, autour du bar.', stats: count(tables.filter((t) => t.properties?.zoneId === z.id)) })),
        { view: overview(rPlan), title: 'Toute la maison', kicker: rest.name, text: 'Vous avez vu ce qui reste libre ce soir. Choisissez votre table sur le plan.', stats: count(tables), cta: { to: `/restaurants/${rest.id}/reserver`, label: 'Choisir ma table' } },
      ],
    };
    let cinema = null;
    if (session && seats) {
      const cPlan = session.plan;
      const cDoor = cPlan.elements.find((e) => e.type === 'door');
      const seatEls = cPlan.elements.filter((e) => e.type === 'seat');
      const rows = [...new Set(seatEls.map((s) => s.properties?.row))];
      const third = Math.ceil(rows.length / 3);
      const group = (rs) => seatEls.filter((s) => rs.includes(s.properties?.row));
      const back = rows.slice(-third); const mid = rows.slice(third, rows.length - third); const front = rows.slice(0, third);
      const cy = (rs) => { const g = group(rs); return g.reduce((a, s) => a + s.y + s.height / 2, 0) / Math.max(1, g.length); };
      const cnt = (list) => ({ free: list.filter((s) => s.status === 'active' && !seats.occupied.has(s.id) && !seats.locked.has(s.id)).length, booked: list.filter((s) => seats.occupied.has(s.id) || seats.locked.has(s.id)).length });
      const screen = cPlan.elements.find((e) => e.type === 'screen');
      cinema = {
        plan: cPlan,
        steps: [
          { view: { ...doorView(cPlan, cDoor), x: cPlan.width / 2 }, title: 'On entre dans la salle', kicker: session.hall.name, text: `${session.film.title}, ${formatTime(session.startsAt)}. Les fauteuils dorés sont libres, les fauteuils barrés sont déjà pris.`, stats: cnt(seatEls) },
          { view: { x: cPlan.width / 2, y: cy(back), s: 2, rx: 52 }, title: 'Les derniers rangs', kicker: session.hall.name, text: 'Le recul de toute la salle, et les fauteuils VIP.', stats: cnt(group(back)), reveal: back },
          { view: { x: cPlan.width / 2, y: cy(mid), s: 1.8, rx: 44 }, title: 'Au cœur de la salle', kicker: session.hall.name, text: 'Les rangs Premium, à la bonne distance de l’écran.', stats: cnt(group(mid)), reveal: mid },
          { view: { x: cPlan.width / 2, y: screen ? screen.y + 150 : cy(front), s: 1.55, rx: 32 }, title: 'Face à l’écran', kicker: session.hall.name, text: 'Les premiers rangs, pour ceux qui veulent être dans l’image.', stats: cnt(group(front)), reveal: front },
          { view: overview(cPlan), title: 'Toute la salle', kicker: session.hall.name, text: 'Choisissez votre fauteuil exact, il est bloqué pour vous pendant le paiement.', stats: cnt(seatEls), cta: { to: `/cinema/seances/${session.id}`, label: 'Choisir mon siège' } },
        ],
      };
    }
    return cinema ? [restaurant, cinema] : [restaurant];
  }, [data]);

  const metrics = useMemo(() => {
    if (!scenes || !size) return null;
    return scenes.map((sc) => {
      const k = Math.min((size.w * 0.86) / sc.plan.width, (size.h * 0.74) / sc.plan.height);
      return { W: sc.plan.width * k, H: sc.plan.height * k, k };
    });
  }, [scenes, size]);

  useLayoutEffect(() => {
    if (!scenes || !metrics || reduced) return undefined;
    const built = scenes.map((sc, si) => ({
      layer: layers[si].current,
      doors: [doors[0].current, doors[1].current],
      steps: sc.steps.map((st) => ({
        ...st,
        reveal: si === 0
          ? (st.zoneId ? Object.entries(tableRefs.current).filter(([, n]) => n?.dataset.zone === st.zoneId).map(([, n]) => n) : [])
          : (st.reveal ? Object.values(seatRefs.current).filter((n) => n && st.reveal.includes(n.dataset.row)) : []),
      })),
    }));
    // gsap.context + revert : au démontage (ou double montage en mode strict) tout revient à l'état initial.
    const ctx = gsap.context(() => {
      buildWalkthrough({
        section: section.current,
        scenes: built,
        metrics,
        onStep: (s, p) => {
          if (s !== stepRef.current) { stepRef.current = s; setStep(s); }
          setProgress((old) => (Math.abs(old - p) > 0.01 ? p : old));
        },
      });
    }, section);
    return () => ctx.revert();
  }, [scenes, metrics]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) return null;
  const [si, idx] = step.split(':').map(Number);
  const cur = scenes?.[si]?.steps[idx];
  const allSteps = scenes ? scenes.flatMap((sc, a) => sc.steps.map((st, b) => ({ key: `${a}:${b}`, title: st.title }))) : [];

  if (reduced && scenes && metrics) {
    // Mouvement réduit : les deux plans vus d'en haut, sans épinglage ni caméra.
    return (
      <section className="border-t border-line bg-ink py-24" aria-labelledby="visit-title">
        <h2 id="visit-title" className="display text-center text-[clamp(2.4rem,5vw,4.5rem)]">Entrez, <em>regardez</em></h2>
        <div className="mx-auto mt-6 flex max-w-md flex-col items-center gap-3 px-4 text-center">
          <p className="text-sm text-mist">Votre appareil demande de réduire les animations : la visite au défilement (entrer dans le restaurant puis dans la salle) est remplacée par les plans ci-dessous.</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMotionChoice('on')}>Voir la visite animée</button>
        </div>
        <div ref={stage} className="mx-auto mt-12 grid max-w-[1200px] gap-10 px-4 sm:px-8 md:grid-cols-2">
          {scenes.map((sc, i) => {
            const last = sc.steps[sc.steps.length - 1];
            return (
              <div key={i}>
                <div className="aspect-[4/3] overflow-hidden rounded-[4px] border border-line">{i === 0 ? <RestaurantScene rest={data.rest} avail={data.avail} tableRefs={tableRefs} /> : <CinemaScene session={data.session} seats={data.seats} seatRefs={seatRefs} />}</div>
                <p className="display-sm mt-4 text-2xl">{last.kicker}</p>
                <p className="mt-1 text-sm text-mist">{last.stats.free} libres · {last.stats.booked} réservées</p>
                <Link to={last.cta.to} className="link-arrow mt-3 text-paper">{last.cta.label} <ArrowUpRight className="size-3.5" /></Link>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section ref={section} className="relative h-[100svh] overflow-hidden border-t border-line bg-ink" aria-labelledby="visit-title">
      <h2 id="visit-title" className="sr-only">Visite d’un restaurant et d’une salle de cinéma, avec les places libres et réservées</h2>
      <div ref={stage} className="absolute inset-x-0 bottom-0 top-[4.75rem] overflow-hidden">
        {scenes && metrics && scenes.map((sc, i) => (
          // La perspective doit être sur le parent direct du calque transformé en 3D.
          <div key={i} className="absolute inset-0 grid place-items-center" style={{ perspective: '1000px', perspectiveOrigin: '50% 35%' }}>
            <div ref={layers[i]} style={{ width: metrics[i].W, height: metrics[i].H, transformOrigin: '50% 50%', willChange: 'transform', transform: cameraTransform(sc.steps[0].view, metrics[i]) }}>
              {i === 0 ? <RestaurantScene rest={data.rest} avail={data.avail} tableRefs={tableRefs} /> : <CinemaScene session={data.session} seats={data.seats} seatRefs={seatRefs} />}
            </div>
          </div>
        ))}
        {/* profondeur : le fond de la pièce se perd dans le noir */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#0a0a0b_0%,rgb(10_10_11/0.6)_22%,transparent_45%,transparent_80%,rgb(10_10_11/0.85)_100%)]" />
        {/* Portes */}
        <div ref={doors[0]} className="absolute inset-y-0 left-0 w-1/2 border-r border-gold/40 bg-ink" aria-hidden>
          <div className="absolute right-6 top-1/2 h-24 w-1.5 -translate-y-1/2 rounded-full bg-gold/70" />
        </div>
        <div ref={doors[1]} className="absolute inset-y-0 right-0 w-1/2 border-l border-gold/40 bg-ink" aria-hidden>
          <div className="absolute left-6 top-1/2 h-24 w-1.5 -translate-y-1/2 rounded-full bg-gold/70" />
        </div>
        {!scenes && <p className="absolute inset-0 grid place-items-center text-sm text-mist">Ouverture des portes…</p>}
      </div>

      {cur && (
        <div className="pointer-events-none absolute inset-x-0 top-[6.5rem] z-10 px-4 text-center sm:px-8">
          <p key={step} className="display text-[clamp(2rem,4.4vw,3.8rem)] [animation:walk-in_700ms_var(--ease-out-expo)]"><em>{cur.title}</em></p>
        </div>
      )}

      {cur && (
        <div className="absolute bottom-6 left-4 right-4 z-10 max-w-sm rounded-[4px] border border-line bg-ink/85 p-5 backdrop-blur sm:left-8 sm:right-auto" aria-live="polite">
          <p className="display-sm text-xl">{cur.kicker}</p>
          <p className="mt-2 text-sm leading-relaxed text-paper/85">{cur.text}</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-paper">
            <Stat swatch={FREE_SWATCH}><span className="tabular font-semibold">{cur.stats.free}</span> {si === 0 ? 'tables libres' : 'fauteuils libres'}</Stat>
            <Stat swatch={BOOKED_SWATCH}><span className="tabular font-semibold">{cur.stats.booked}</span> déjà réservé{cur.stats.booked > 1 ? 's' : ''}</Stat>
          </div>
          {cur.cta && <Link to={cur.cta.to} className="btn btn-primary btn-sm mt-5">{cur.cta.label} <ArrowUpRight className="size-3.5" /></Link>}
        </div>
      )}

      {allSteps.length > 0 && (
        <ol className="absolute right-6 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-3 lg:flex" aria-label="Étapes de la visite">
          {allSteps.map((s) => (
            <li key={s.key} className={`flex items-center justify-end gap-3 text-[0.6875rem] uppercase tracking-[0.12em] transition-colors duration-500 ${s.key === step ? 'text-paper' : 'text-mist/50'}`}>
              {s.title}<span className={`h-px transition-all duration-500 ${s.key === step ? 'w-8 bg-gold' : 'w-3 bg-mist/40'}`} />
            </li>
          ))}
        </ol>
      )}
      <div className="absolute inset-x-0 bottom-0 z-10 h-px bg-line"><div className="h-px origin-left bg-gold" style={{ transform: `scaleX(${progress})` }} /></div>
    </section>
  );
}
