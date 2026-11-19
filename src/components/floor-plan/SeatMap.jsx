import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Accessibility } from 'lucide-react';
import { usePanZoom } from '../../hooks/usePanZoom';
import { useGsap } from '../../hooks/useGsap';
import { focusCategory, pulseSeat, revealHall } from '../../animations/cinemaAnimations';
import { Legend, PlanDefs, ZoomControls } from './PlanControls';
import { SEAT_CATEGORIES } from '../../utils/planGenerators';
import { formatPrice } from '../../utils/format';

const STYLE = {
  standard: { fill: '#2a2434', stroke: '#96919E' },
  premium: { fill: 'rgba(168,85,247,0.14)', stroke: '#A855F7' },
  vip: { fill: 'rgba(233,213,255,0.16)', stroke: '#E9D5FF' },
};

/** Fauteuil vu de dessus : assise + dossier, proportionnel à l'élément. */
export function SeatShape({ w, h, fill, stroke, dashed, cross }) {
  const back = Math.max(5, h * 0.24);
  return (
    <>
      <rect x="1" y="1" width={w - 2} height={h - 2} rx={Math.min(8, w / 4)} fill={fill} stroke={stroke} strokeWidth="1.5" strokeDasharray={dashed ? '3 3' : undefined} />
      <rect x="4" y={h - back - 3} width={w - 8} height={back} rx={back / 2} fill={stroke} opacity="0.55" />
      {cross && <path d={`M${w * 0.35} ${h * 0.3} L${w * 0.65} ${h * 0.6} M${w * 0.65} ${h * 0.3} L${w * 0.35} ${h * 0.6}`} stroke="#5d5668" strokeWidth="1.6" strokeLinecap="round" />}
    </>
  );
}

export function seatVisual(seat, state) {
  const base = STYLE[seat.category] || STYLE.standard;
  if (state === 'selected') return { fill: '#F8F6FA', stroke: '#A855F7' };
  if (state === 'occupied') return { fill: '#15121c', stroke: '#2a2434', cross: true };
  if (state === 'locked') return { fill: 'url(#hatch)', stroke: '#5a4a2a' };
  if (state === 'disabled') return { fill: 'transparent', stroke: '#3a3446', dashed: true };
  return base;
}

export const SEAT_LEGEND = [
  { label: 'Standard', swatch: <rect x="2" y="3" width="16" height="14" rx="4" fill={STYLE.standard.fill} stroke={STYLE.standard.stroke} strokeWidth="1.5" /> },
  { label: 'Premium', swatch: <rect x="2" y="3" width="16" height="14" rx="4" fill={STYLE.premium.fill} stroke={STYLE.premium.stroke} strokeWidth="1.5" /> },
  { label: 'VIP', swatch: <rect x="2" y="3" width="16" height="14" rx="4" fill={STYLE.vip.fill} stroke={STYLE.vip.stroke} strokeWidth="1.5" /> },
  { label: 'Votre sélection', swatch: <rect x="2" y="3" width="16" height="14" rx="4" fill="#F8F6FA" stroke="#A855F7" strokeWidth="1.5" /> },
  { label: 'Occupé', swatch: <><rect x="2" y="3" width="16" height="14" rx="4" fill="#15121c" stroke="#2a2434" strokeWidth="1.5" /><path d="M7 7l6 6M13 7l-6 6" stroke="#5d5668" strokeWidth="1.5" /></> },
  { label: 'En cours de réservation', swatch: <><defs><pattern id="hl" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)"><rect width="4" height="4" fill="#1b1724" /><line x1="0" y1="0" x2="0" y2="4" stroke="#F5B84A" strokeWidth="1.5" opacity="0.6" /></pattern></defs><rect x="2" y="3" width="16" height="14" rx="4" fill="url(#hl)" stroke="#5a4a2a" strokeWidth="1.5" /></> },
  { label: 'Indisponible', swatch: <rect x="2" y="3" width="16" height="14" rx="4" fill="none" stroke="#3a3446" strokeWidth="1.5" strokeDasharray="3 3" /> },
];

/**
 * Plan de salle interactif. N'invente aucun état : il affiche ce que fournit le serveur
 * (occupés, verrouillés) et la sélection locale ; les animations ne modifient jamais ces états.
 */
export default function SeatMap({ plan, occupied, locked, selected, onToggle, prices, highlight, interactive = true, height = 'min(68vh, 640px)' }) {
  const svgRef = useRef(null);
  const wrap = useRef(null);
  const pz = usePanZoom(svgRef, { width: plan.width, height: plan.height, maxZoom: 3.5 });
  const [tip, setTip] = useState(null);
  const nodes = useRef({});

  const seats = useMemo(() => plan.elements.filter((e) => e.type === 'seat'), [plan]);
  const rows = useMemo(() => {
    const m = new Map();
    seats.forEach((s) => {
      const r = s.properties?.row || '?';
      if (!m.has(r)) m.set(r, []);
      m.get(r).push(s);
    });
    return [...m.entries()].map(([row, list]) => ({
      row, list,
      y: list.reduce((a, s) => a + s.y + s.height / 2, 0) / list.length,
      minX: Math.min(...list.map((s) => s.x)), maxX: Math.max(...list.map((s) => s.x + s.width)),
    }));
  }, [seats]);

  // Cadre initial : l'écran et les sièges, sans les marges vides de la scène.
  const content = useMemo(() => {
    const items = plan.elements.filter((e) => e.type === 'seat' || e.type === 'screen');
    if (!items.length) return null;
    const pad = 40;
    const x0 = Math.min(...items.map((e) => e.x)) - pad;
    const y0 = Math.min(...items.map((e) => e.y)) - pad;
    const x1 = Math.max(...items.map((e) => e.x + e.width)) + pad;
    const y1 = Math.max(...items.map((e) => e.y + e.height)) + pad;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }, [plan]);
  useLayoutEffect(() => { if (content) pz.setViewRaw(content); }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  useGsap(({ reduced }) => { revealHall(svgRef.current, { reduced }); }, [plan], wrap);
  useLayoutEffect(() => { if (svgRef.current) focusCategory(svgRef.current, highlight); }, [highlight, plan]);

  const stateOf = (s) => {
    if (s.status !== 'active') return 'disabled';
    if (selected.has(s.id)) return 'selected';
    if (occupied.has(s.id)) return 'occupied';
    if (locked.has(s.id)) return 'locked';
    return 'available';
  };

  const showTip = (s, el) => {
    if (!el || !wrap.current) return;
    const r = el.getBoundingClientRect();
    const w = wrap.current.getBoundingClientRect();
    setTip({ seat: s, x: r.left - w.left + r.width / 2, y: r.top - w.top });
  };

  const activate = (s) => {
    if (!interactive || pz.wasDrag()) return;
    const st = stateOf(s);
    if (st === 'available' || st === 'selected') {
      onToggle(s);
      pulseSeat(nodes.current[s.id], st === 'available');
    }
    showTip(s, nodes.current[s.id]);
  };

  const screen = plan.elements.find((e) => e.type === 'screen');
  const tipState = tip && stateOf(tip.seat);

  return (
    <div ref={wrap} className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={pz.viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="block w-full touch-none"
        style={{ maxHeight: height, aspectRatio: content ? `${content.w} / ${content.h}` : `${plan.width} / ${plan.height}` }}
        role="group"
        aria-label={`Plan de la salle, ${seats.length} sièges`}
        {...pz.handlers}
        onPointerLeave={(e) => { pz.handlers.onPointerLeave(e); }}
      >
        <PlanDefs />
        {screen && (
          <g data-screen>
            <path d={`M${screen.x} ${screen.y + screen.height} Q ${screen.x + screen.width / 2} ${screen.y + screen.height + 120} ${screen.x + screen.width} ${screen.y + screen.height} L ${screen.x + screen.width - 40} ${screen.y + 150} Q ${screen.x + screen.width / 2} ${screen.y + 230} ${screen.x + 40} ${screen.y + 150} Z`} fill="url(#screenGlow)" opacity="0.5" />
            <path d={`M${screen.x} ${screen.y + screen.height} Q ${screen.x + screen.width / 2} ${screen.y - (screen.properties?.curve || 24)} ${screen.x + screen.width} ${screen.y + screen.height}`} fill="none" stroke="#F8F6FA" strokeWidth="5" strokeLinecap="round" filter="url(#glow)" />
            <text x={screen.x + screen.width / 2} y={screen.y + screen.height + 30} textAnchor="middle" fill="#96919E" fontSize="13" letterSpacing="6" fontFamily="Hanken Grotesk">ÉCRAN</text>
          </g>
        )}
        {plan.elements.filter((e) => e.type === 'door').map((d) => (
          <g key={d.id}>
            <rect x={d.x} y={d.y} width={d.width} height={d.height} rx="3" fill="#2a2434" />
            <text x={d.x + d.width / 2} y={d.y - 6} textAnchor="middle" fill="#96919E" fontSize="11" fontFamily="Hanken Grotesk">{d.label}</text>
          </g>
        ))}
        {plan.elements.filter((e) => e.type === 'label').map((l) => (
          <text key={l.id} x={l.x} y={l.y + l.height / 2} fill="#96919E" fontSize="14" fontFamily="Hanken Grotesk">{l.label}</text>
        ))}
        {rows.map((r) => (
          <g key={r.row} data-row={r.row}>
            <text x={r.minX - 22} y={r.y + 4} textAnchor="middle" fill="#6f6a78" fontSize="13" fontWeight="600" fontFamily="Hanken Grotesk">{r.row}</text>
            <text x={r.maxX + 22} y={r.y + 4} textAnchor="middle" fill="#6f6a78" fontSize="13" fontWeight="600" fontFamily="Hanken Grotesk">{r.row}</text>
            {r.list.map((s) => {
              const st = stateOf(s);
              const v = seatVisual(s, st);
              const clickable = interactive && (st === 'available' || st === 'selected');
              return (
                <g
                  key={s.id}
                  data-seat={s.id}
                  data-category={s.category}
                  transform={`translate(${s.x} ${s.y}) rotate(${s.rotation || 0} ${s.width / 2} ${s.height / 2})`}
                  role={interactive ? 'button' : undefined}
                  tabIndex={clickable ? 0 : -1}
                  aria-pressed={st === 'selected'}
                  aria-disabled={!clickable}
                  aria-label={`Rang ${s.properties?.row}, siège ${s.properties?.number}, ${SEAT_CATEGORIES[s.category]?.label}${st === 'occupied' ? ', occupé' : st === 'locked' ? ', en cours de réservation' : st === 'disabled' ? ', indisponible' : `, ${formatPrice(prices?.[s.category])}`}`}
                  className={clickable ? 'cursor-pointer outline-none [&:focus-visible_rect]:stroke-[3]' : 'cursor-not-allowed'}
                  filter={st === 'selected' ? 'url(#glow)' : undefined}
                  onClick={() => activate(s)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(s); } }}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && showTip(s, e.currentTarget)}
                  onPointerLeave={(e) => e.pointerType === 'mouse' && setTip(null)}
                  onFocus={(e) => showTip(s, e.currentTarget)}
                  onBlur={() => setTip(null)}
                >
                  <g ref={(n) => { nodes.current[s.id] = n; }}>
                    <SeatShape w={s.width} h={s.height} {...v} />
                    {s.properties?.accessible && st !== 'selected' && <circle cx={s.width / 2} cy={s.height * 0.38} r="3.5" fill="#60a5fa" />}
                  </g>
                </g>
              );
            })}
          </g>
        ))}
      </svg>

      {tip && (
        <div role="tooltip" className="pointer-events-none absolute z-20 w-max max-w-56 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-[3px] border border-line bg-ink-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur" style={{ left: tip.x, top: tip.y }}>
          <p className="font-semibold text-paper">Rang {tip.seat.properties?.row} · Siège {tip.seat.properties?.number}</p>
          <p className="text-mist">
            {SEAT_CATEGORIES[tip.seat.category]?.label}
            {tipState === 'occupied' ? ' · Occupé' : tipState === 'locked' ? ' · Réservation en cours par un autre client' : tipState === 'disabled' ? ' · Indisponible' : ` · ${formatPrice(prices?.[tip.seat.category])}`}
          </p>
          {tip.seat.properties?.accessible && <p className="mt-1 flex items-center gap-1 text-[#93c5fd]"><Accessibility className="size-3" />Accès fauteuil roulant</p>}
        </div>
      )}

      <ZoomControls pz={{ ...pz, fitContent: content ? () => pz.setViewRaw(content) : null }} className="absolute bottom-3 right-3" />
      <p className="pointer-events-none absolute bottom-3 left-3 hidden text-[0.6875rem] text-mist/70 sm:block">Glisser pour déplacer · Ctrl + molette ou pincer pour zoomer</p>
    </div>
  );
}

export { Legend };
