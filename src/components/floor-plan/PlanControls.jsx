import { Maximize2, Minus, Plus } from 'lucide-react';

export function ZoomControls({ pz, className = '' }) {
  const btn = 'grid size-10 place-items-center text-paper hover:bg-ink-3 disabled:opacity-40';
  return (
    <div className={`glass flex flex-col overflow-hidden rounded-[4px] border border-line bg-ink-2/85 backdrop-blur ${className}`}>
      <button type="button" className={btn} onClick={pz.zoomIn} aria-label="Zoomer"><Plus className="size-4" /></button>
      <button type="button" className={`${btn} border-y border-line`} onClick={pz.zoomOut} aria-label="Dézoomer"><Minus className="size-4" /></button>
      <button type="button" className={btn} onClick={pz.fitContent || pz.reset} aria-label="Voir tout le plan"><Maximize2 className="size-4" /></button>
    </div>
  );
}

export function Legend({ items, className = '' }) {
  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-2 text-xs text-mist ${className}`} aria-label="Légende">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <svg viewBox="0 0 20 20" className="size-4" aria-hidden>{i.swatch}</svg>
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function PlanDefs() {
  return (
    <defs>
      <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#1b1724" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="#F5B84A" strokeWidth="2" opacity="0.55" />
      </pattern>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <linearGradient id="screenGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#A855F7" stopOpacity="0.45" />
        <stop offset="1" stopColor="#A855F7" stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}
