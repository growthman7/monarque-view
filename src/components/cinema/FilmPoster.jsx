import { Img } from '../common';

/**
 * Affiche typographique générée à partir de la palette et du motif du film.
 * Quand l'administrateur renseigne une vraie affiche (posterUrl), elle la remplace.
 */
function Motif({ motif, accent, ink }) {
  switch (motif) {
    case 'sun':
      return (
        <g>
          <circle cx="200" cy="250" r="120" fill={accent} opacity="0.9" />
          {Array.from({ length: 9 }).map((_, i) => <rect key={i} x="40" y={262 + i * 14} width="320" height="6" fill="currentColor" opacity="0.9" style={{ color: 'var(--poster-bg)' }} />)}
        </g>
      );
    case 'wave':
      return (
        <g fill="none" stroke={accent} strokeWidth="3">
          {Array.from({ length: 12 }).map((_, i) => <path key={i} d={`M-20 ${160 + i * 18} C 80 ${120 + i * 18}, 160 ${210 + i * 18}, 260 ${160 + i * 18} S 380 ${120 + i * 18}, 440 ${170 + i * 18}`} opacity={1 - i * 0.07} />)}
        </g>
      );
    case 'beam':
      return (
        <g>
          <polygon points="330,90 20,300 20,420" fill={accent} opacity="0.85" />
          <rect x="318" y="76" width="44" height="30" rx="6" fill={ink} />
        </g>
      );
    case 'orbit':
      return (
        <g fill="none" stroke={accent}>
          <ellipse cx="200" cy="250" rx="170" ry="54" strokeWidth="2" transform="rotate(-18 200 250)" />
          <ellipse cx="200" cy="250" rx="120" ry="38" strokeWidth="1.5" transform="rotate(-18 200 250)" opacity="0.6" />
          <circle cx="200" cy="250" r="44" fill={accent} stroke="none" />
          <circle cx="352" cy="200" r="7" fill={ink} stroke="none" />
        </g>
      );
    case 'stripes':
      return (
        <g>
          {Array.from({ length: 7 }).map((_, i) => <rect key={i} x={30 + i * 50} y="110" width="22" height="300" rx="11" fill={i % 2 ? accent : ink} opacity={i % 2 ? 1 : 0.85} />)}
        </g>
      );
    case 'leaf':
      return (
        <g fill={accent}>
          {Array.from({ length: 6 }).map((_, i) => <path key={i} d="M200 400 C 120 330, 120 210, 200 130 C 280 210, 280 330, 200 400 Z" transform={`rotate(${-75 + i * 30} 200 400)`} opacity={0.35 + i * 0.1} />)}
        </g>
      );
    case 'moon':
      return (
        <g>
          <circle cx="240" cy="210" r="90" fill={accent} />
          <circle cx="280" cy="180" r="82" fill="var(--poster-bg)" />
          <rect x="0" y="360" width="400" height="2" fill={ink} opacity="0.6" />
        </g>
      );
    default:
      return (
        <g stroke={accent} strokeWidth="1.5" opacity="0.8">
          {Array.from({ length: 9 }).map((_, i) => <line key={`v${i}`} x1={40 + i * 40} y1="100" x2={40 + i * 40} y2="420" />)}
          {Array.from({ length: 9 }).map((_, i) => <line key={`h${i}`} x1="40" y1={100 + i * 40} x2="360" y2={100 + i * 40} />)}
          <rect x="160" y="220" width="80" height="80" fill={accent} />
        </g>
      );
  }
}

export default function FilmPoster({ film, className = '', showLabel = true }) {
  if (film.posterUrl) return <Img src={film.posterUrl} alt={`Affiche du film ${film.title}`} className={`aspect-[2/3] ${className}`} />;
  const { bg, ink, accent, motif } = film.poster || {};
  const words = film.title.split(' ');
  const lines = [];
  words.forEach((w) => {
    const last = lines[lines.length - 1];
    if (last && (last + ' ' + w).length <= 11) lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
  });
  return (
    <div className={`relative aspect-[2/3] overflow-hidden ${className}`} style={{ background: bg, '--poster-bg': bg }}>
      <svg viewBox="0 0 400 600" className="h-full w-full" role="img" aria-label={`Affiche du film ${film.title}`}>
        <Motif motif={motif} accent={accent} ink={ink} />
        <text x="30" y="52" fill={ink} fontFamily="Hanken Grotesk, sans-serif" fontSize="15" fontWeight="600" letterSpacing="3">{(film.director || '').toUpperCase()}</text>
        {lines.map((l, i) => (
          <text key={i} x="28" y={470 + i * 52 - (lines.length - 1) * 26} fill={ink} fontFamily="Bodoni Moda, serif" fontSize={lines.length > 2 ? 46 : 54} letterSpacing="-1.5">{l}</text>
        ))}
        <text x="30" y="572" fill={ink} opacity="0.7" fontFamily="Hanken Grotesk, sans-serif" fontSize="12" letterSpacing="2">{(film.genres || []).join(' · ').toUpperCase()}</text>
      </svg>
      {showLabel && <span className="absolute right-2 top-2 rounded-full bg-ink/60 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-paper/80 backdrop-blur">Affiche démo</span>}
    </div>
  );
}
