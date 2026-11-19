import { useState } from 'react';
import { formatPrice, formatShortDay } from '../../utils/format';

/** Barres empilées cinéma / restaurant par jour, avec infobulle au survol. */
export function RevenueChart({ data }) {
  const [hover, setHover] = useState(null);
  const W = 720;
  const H = 240;
  const pad = { l: 8, r: 8, t: 16, b: 28 };
  const max = Math.max(1, ...data.map((d) => d.cinema + d.restaurant));
  const bw = (W - pad.l - pad.r) / data.length;
  const y = (v) => ((H - pad.t - pad.b) * v) / max;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-60 w-full" role="img" aria-label="Chiffre d’affaires des 14 derniers jours">
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={pad.l} x2={W - pad.r} y1={H - pad.b - (H - pad.t - pad.b) * f} y2={H - pad.b - (H - pad.t - pad.b) * f} stroke="#2a2434" strokeDasharray="2 4" />)}
        {data.map((d, i) => {
          const x = pad.l + i * bw + bw * 0.18;
          const w = bw * 0.64;
          const hc = y(d.cinema);
          const hr = y(d.restaurant);
          return (
            <g key={d.day} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill={hover === i ? '#1b1724' : 'transparent'} />
              <rect x={x} y={H - pad.b - hc} width={w} height={hc} rx="3" fill="#7628C8" />
              <rect x={x} y={H - pad.b - hc - hr - (hr ? 2 : 0)} width={w} height={hr} rx="3" fill="#E9D5FF" />
              {(i % 2 === 0 || data.length < 8) && <text x={x + w / 2} y={H - 8} textAnchor="middle" fill="#96919E" fontSize="11" fontFamily="Hanken Grotesk">{formatShortDay(`${d.day}T12:00`)}</text>}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-[3px] border border-line bg-ink-2 px-3 py-2 text-xs shadow-xl" style={{ left: `${Math.min(80, (hover / data.length) * 100)}%` }}>
          <p className="font-semibold">{formatShortDay(`${data[hover].day}T12:00`)}</p>
          <p className="text-mist"><span className="mr-1 inline-block size-2 rounded-sm bg-violet" />Cinéma {formatPrice(data[hover].cinema)}</p>
          <p className="text-mist"><span className="mr-1 inline-block size-2 rounded-sm bg-[#E9D5FF]" />Restaurants {formatPrice(data[hover].restaurant)}</p>
        </div>
      )}
      <div className="mt-2 flex gap-4 text-xs text-mist">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-violet" />Cinéma</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#E9D5FF]" />Restaurants (acomptes)</span>
      </div>
    </div>
  );
}

export function OccupancyBars({ items }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={i.id}>
          <div className="flex justify-between text-sm"><span>{i.name}</span><span className="tabular text-mist">{Math.round(i.rate * 100)} %</span></div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-3">
            <div className="h-full rounded-full bg-violet-hi transition-[width] duration-700" style={{ width: `${Math.round(i.rate * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
