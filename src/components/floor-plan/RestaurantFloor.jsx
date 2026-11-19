import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { usePanZoom } from '../../hooks/usePanZoom';
import { enterRestaurant, flyTo, pulseTable } from '../../animations/restaurantAnimations';
import { prefersReducedMotion, gsap } from '../../animations/animationConfig';
import { Legend, PlanDefs, ZoomControls } from './PlanControls';

export const TABLE_STYLE = {
  available: { fill: '#1b1724', stroke: '#F8F6FA', text: '#F8F6FA', chair: '#96919E' },
  selected: { fill: '#A855F7', stroke: '#F8F6FA', text: '#08070B', chair: '#E9D5FF' },
  occupied: { fill: '#121019', stroke: '#2a2434', text: '#5d5668', chair: '#2a2434' },
  locked: { fill: 'url(#hatch)', stroke: '#5a4a2a', text: '#c9a45a', chair: '#3a3020' },
  too_small: { fill: '#121019', stroke: '#3a3446', text: '#5d5668', chair: '#2a2434', dashed: true },
  min_party: { fill: '#121019', stroke: '#3a3446', text: '#5d5668', chair: '#2a2434', dashed: true },
  disabled: { fill: 'transparent', stroke: '#3a3446', text: '#5d5668', chair: '#2a2434', dashed: true },
  neutral: { fill: '#1b1724', stroke: '#96919E', text: '#F8F6FA', chair: '#5d5668' },
};

export const TABLE_STATE_LABEL = {
  available: 'Disponible', selected: 'Votre table', occupied: 'Déjà réservée', locked: 'En cours de réservation',
  too_small: 'Trop petite pour votre groupe', min_party: 'Groupe trop petit pour cette table', disabled: 'Non réservable',
};

export const TABLE_LEGEND = [
  { label: 'Disponible', swatch: <circle cx="10" cy="10" r="7" fill={TABLE_STYLE.available.fill} stroke={TABLE_STYLE.available.stroke} strokeWidth="1.5" /> },
  { label: 'Votre table', swatch: <circle cx="10" cy="10" r="7" fill="#A855F7" stroke="#F8F6FA" strokeWidth="1.5" /> },
  { label: 'Réservée', swatch: <circle cx="10" cy="10" r="7" fill="#121019" stroke="#2a2434" strokeWidth="1.5" /> },
  { label: 'En cours de réservation', swatch: <><defs><pattern id="hl2" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)"><rect width="4" height="4" fill="#1b1724" /><line x1="0" y1="0" x2="0" y2="4" stroke="#F5B84A" strokeWidth="1.5" opacity="0.6" /></pattern></defs><circle cx="10" cy="10" r="7" fill="url(#hl2)" stroke="#5a4a2a" strokeWidth="1.5" /></> },
  { label: 'Capacité inadaptée', swatch: <circle cx="10" cy="10" r="7" fill="#121019" stroke="#3a3446" strokeWidth="1.5" strokeDasharray="3 2" /> },
];

/** Chaises réparties autour de la table selon sa forme et sa capacité. */
function chairs(t) {
  const out = [];
  const { width: w, height: h, capacity: n } = t;
  const shape = t.properties?.shape || 'square';
  if (shape === 'round') {
    const r = w / 2 + 10;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      out.push({ x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r, a: (a * 180) / Math.PI + 90 });
    }
    return out;
  }
  const long = shape === 'rect' && w >= h;
  const perLong = shape === 'rect' ? Math.ceil((n - (n >= 6 ? 2 : 0)) / 2) : Math.ceil(n / 4);
  const sides = shape === 'rect'
    ? [{ side: 'top', count: perLong }, { side: 'bottom', count: n - perLong - (n >= 6 ? 2 : 0) }, ...(n >= 6 ? [{ side: 'left', count: 1 }, { side: 'right', count: 1 }] : [])]
    : [{ side: 'top', count: Math.ceil(n / 4) }, { side: 'bottom', count: Math.ceil((n - 1) / 4) }, { side: 'left', count: Math.ceil((n - 2) / 4) }, { side: 'right', count: Math.max(0, Math.ceil((n - 3) / 4)) }];
  void long;
  for (const { side, count } of sides) {
    for (let i = 0; i < count; i += 1) {
      const f = (i + 1) / (count + 1);
      if (side === 'top') out.push({ x: w * f, y: -11, a: 0 });
      if (side === 'bottom') out.push({ x: w * f, y: h + 11, a: 180 });
      if (side === 'left') out.push({ x: -11, y: h * f, a: 270 });
      if (side === 'right') out.push({ x: w + 11, y: h * f, a: 90 });
    }
  }
  return out;
}

export function TableShape({ t, style, label = true }) {
  const shape = t.properties?.shape || 'square';
  return (
    <>
      {chairs(t).map((c, i) => (
        <rect key={i} x={c.x - 8} y={c.y - 5} width="16" height="10" rx="4" fill={style.chair} transform={`rotate(${c.a} ${c.x} ${c.y})`} />
      ))}
      {shape === 'round'
        ? <ellipse cx={t.width / 2} cy={t.height / 2} rx={t.width / 2} ry={t.height / 2} fill={style.fill} stroke={style.stroke} strokeWidth="1.8" strokeDasharray={style.dashed ? '5 4' : undefined} />
        : <rect x="0" y="0" width={t.width} height={t.height} rx={shape === 'square' ? 8 : 12} fill={style.fill} stroke={style.stroke} strokeWidth="1.8" strokeDasharray={style.dashed ? '5 4' : undefined} />}
      {label && (
        <>
          <text x={t.width / 2} y={t.height / 2 - 2} textAnchor="middle" fill={style.text} fontSize="14" fontWeight="700" fontFamily="Hanken Grotesk" transform={`rotate(${-(t.rotation || 0)} ${t.width / 2} ${t.height / 2})`}>{t.label}</text>
          <text x={t.width / 2} y={t.height / 2 + 13} textAnchor="middle" fill={style.text} opacity="0.75" fontSize="11" fontFamily="Hanken Grotesk" transform={`rotate(${-(t.rotation || 0)} ${t.width / 2} ${t.height / 2})`}>{t.capacity} pl.</text>
        </>
      )}
    </>
  );
}

export function StaticElement({ e }) {
  if (e.type === 'wall') return <rect x={e.x} y={e.y} width={e.width} height={e.height} fill="#3a3446" transform={`rotate(${e.rotation || 0} ${e.x + e.width / 2} ${e.y + e.height / 2})`} />;
  if (e.type === 'door') {
    return (
      <g transform={`rotate(${e.rotation || 0} ${e.x + e.width / 2} ${e.y + e.height / 2})`}>
        <rect x={e.x} y={e.y} width={e.width} height={e.height} fill="#08070B" stroke="#A855F7" strokeWidth="1.5" strokeDasharray="4 3" />
        {e.label && <text x={e.x + e.width / 2} y={e.y + e.height + 16} textAnchor="middle" fill="#A855F7" fontSize="12" fontWeight="600" fontFamily="Hanken Grotesk">{e.label}</text>}
      </g>
    );
  }
  if (e.type === 'decor') {
    const kind = e.properties?.kind;
    if (kind === 'plant') return <g><circle cx={e.x + e.width / 2} cy={e.y + e.height / 2} r={e.width / 2} fill="#1f3a2c" /><circle cx={e.x + e.width / 2} cy={e.y + e.height / 2} r={e.width / 4} fill="#2f6f5e" /></g>;
    return (
      <g transform={`rotate(${e.rotation || 0} ${e.x + e.width / 2} ${e.y + e.height / 2})`}>
        <rect x={e.x} y={e.y} width={e.width} height={e.height} rx="6" fill="#2a2434" stroke="#3a3446" />
        {e.label && <text x={e.x + e.width / 2} y={e.y + e.height / 2 + 4} textAnchor="middle" fill="#96919E" fontSize="12" letterSpacing="2" fontFamily="Hanken Grotesk">{e.label.toUpperCase()}</text>}
      </g>
    );
  }
  if (e.type === 'label') return <text x={e.x} y={e.y + e.height / 2} fill="#96919E" fontSize="14" fontFamily="Hanken Grotesk">{e.label}</text>;
  return null;
}

/**
 * Plan interactif d'un restaurant. `states` vient du calcul de disponibilité du serveur
 * (créneau + nombre de convives). Sans `states` (aperçu éditeur), toutes les tables sont neutres.
 */
const RestaurantFloor = forwardRef(function RestaurantFloor({ plan, states, selectedId, onSelect, onHover, intro = true, height = 'min(70vh, 680px)' }, ref) {
  const svgRef = useRef(null);
  const pz = usePanZoom(svgRef, { width: plan.width, height: plan.height, maxZoom: 4 });
  const tableNodes = useRef({});
  const zoneNodes = useRef([]);
  const zones = useMemo(() => plan.elements.filter((e) => e.type === 'zone'), [plan]);
  const tables = useMemo(() => plan.elements.filter((e) => e.type === 'table'), [plan]);
  const others = useMemo(() => plan.elements.filter((e) => ['wall', 'door', 'decor', 'label'].includes(e.type)), [plan]);
  const [activeZone, setActiveZone] = useState(null);

  // « Entrer » : la caméra part de la porte d'entrée puis recule sur tout le plan.
  useEffect(() => {
    if (!intro || !svgRef.current) return undefined;
    const door = plan.elements.find((e) => e.type === 'door');
    const full = { x: 0, y: 0, w: plan.width, h: plan.height };
    const fw = plan.width / 3.2;
    const from = door ? { x: door.x + door.width / 2 - fw / 2, y: door.y + door.height / 2 - (fw * plan.height) / plan.width / 2, w: fw, h: (fw * plan.height) / plan.width } : full;
    const ctx = gsap.context(() => {
      enterRestaurant({ setView: pz.setViewRaw, from, to: full, zones: zoneNodes.current.filter(Boolean), tables: Object.values(tableNodes.current).filter(Boolean) }, { reduced: prefersReducedMotion() });
    });
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, intro]);

  const goZone = (z) => {
    setActiveZone(z?.id || null);
    const target = z
      ? (() => { const pad = 40; const w = z.width + pad * 2; const h = z.height + pad * 2; const ratio = plan.width / plan.height; const vw = Math.max(w, h * ratio); const vh = vw / ratio; return { x: z.x + z.width / 2 - vw / 2, y: z.y + z.height / 2 - vh / 2, w: vw, h: vh }; })()
      : { x: 0, y: 0, w: plan.width, h: plan.height };
    flyTo(pz.view, target, pz.setViewRaw, { reduced: prefersReducedMotion() });
  };
  useImperativeHandle(ref, () => ({ goZone, zones }));

  const select = (t) => {
    if (pz.wasDrag()) return;
    onSelect?.(t);
    pulseTable(tableNodes.current[t.id]);
  };

  return (
    <div className="relative">
      {zones.length > 1 && (
        <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] gap-1.5 overflow-x-auto rounded-full border border-line bg-ink-2/85 p-1 backdrop-blur" role="group" aria-label="Zones du restaurant">
          <button type="button" className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${!activeZone ? 'bg-paper text-ink' : 'text-mist hover:text-paper'}`} onClick={() => goZone(null)}>Tout le plan</button>
          {zones.map((z) => (
            <button key={z.id} type="button" className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${activeZone === z.id ? 'bg-paper text-ink' : 'text-mist hover:text-paper'}`} onClick={() => goZone(z)}>{z.label}</button>
          ))}
        </div>
      )}
      <svg ref={svgRef} viewBox={pz.viewBox} preserveAspectRatio="xMidYMid meet" className="block w-full touch-none select-none" style={{ height }} role="group" aria-label={`Plan du restaurant, ${tables.length} tables`} {...pz.handlers}>
        <PlanDefs />
        <rect x="0" y="0" width={plan.width} height={plan.height} fill="#0d0b12" />
        {zones.map((z, i) => (
          <g key={z.id} ref={(n) => { zoneNodes.current[i] = n; }}>
            <rect x={z.x} y={z.y} width={z.width} height={z.height} rx="18" fill={z.properties?.color || '#7628C8'} fillOpacity={activeZone === z.id ? 0.2 : 0.09} stroke={z.properties?.color || '#7628C8'} strokeOpacity="0.5" strokeDasharray={z.properties?.outdoor ? '8 6' : undefined} style={{ transition: 'fill-opacity 400ms' }} />
            <text x={z.x + 16} y={z.y + z.height - 14} fill={z.properties?.color || '#A855F7'} fillOpacity="0.95" fontSize="15" fontFamily="Bodoni Moda" fontStyle="italic" letterSpacing="0.5">{z.label}</text>
          </g>
        ))}
        {others.map((e) => <StaticElement key={e.id} e={e} />)}
        {tables.map((t) => {
          const st = t.id === selectedId ? 'selected' : states ? states[t.id] || 'disabled' : 'neutral';
          const style = TABLE_STYLE[st];
          const clickable = !!onSelect && (st === 'available' || st === 'selected' || !states);
          return (
            <g key={t.id} transform={`translate(${t.x} ${t.y}) rotate(${t.rotation || 0} ${t.width / 2} ${t.height / 2})`}>
              <g
                ref={(n) => { tableNodes.current[t.id] = n; }}
                role="button"
                tabIndex={0}
                aria-pressed={st === 'selected'}
                aria-label={`Table ${t.label}, ${t.capacity} places, ${TABLE_STATE_LABEL[st] || ''}`}
                className={`outline-none ${clickable ? 'cursor-pointer' : 'cursor-help'} [&:focus-visible>*]:stroke-violet-hi`}
                filter={st === 'selected' ? 'url(#glow)' : undefined}
                onClick={() => select(t)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(t); } }}
                onPointerEnter={(e) => e.pointerType === 'mouse' && onHover?.(t)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && onHover?.(null)}
              >
                <TableShape t={t} style={style} />
              </g>
            </g>
          );
        })}
      </svg>
      <ZoomControls pz={pz} className="absolute bottom-3 right-3" />
      <p className="pointer-events-none absolute bottom-3 left-3 hidden text-[0.6875rem] text-mist/70 sm:block">Glisser pour se déplacer · Ctrl + molette ou pincer pour zoomer</p>
    </div>
  );
});

export default RestaurantFloor;
export { Legend };
