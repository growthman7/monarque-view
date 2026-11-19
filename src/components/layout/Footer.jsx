import { Link } from 'react-router-dom';
import { Clock, MapPin, Send } from 'lucide-react';
import { useGsap } from '../../hooks/useGsap';
import { gsap, prefersReducedMotion, setMotionChoice } from '../../animations/animationConfig';
import { SITE } from '../../config/site';
import { Wordmark } from './Navbar';

/** Plan indicatif d'Abidjan : la lagune Ébrié et les adresses MONARQUE (illustration, pas une carte exacte). */
function LagoonMap() {
  const pins = [
    { x: 455, y: 205, label: 'Plateau · Cinéma, Le Velours' },
    { x: 600, y: 140, label: 'Cocody · Maison Akwaba, Nonna' },
    { x: 760, y: 120, label: 'Riviera · Atelier Brasero' },
    { x: 560, y: 300, label: 'Marcory · Terrasse Lagune' },
  ];
  return (
    <svg viewBox="0 0 1000 420" className="h-auto w-full" role="img" aria-label="Plan indicatif des adresses MONARQUE à Abidjan">
      <rect width="1000" height="420" fill="#0f0f11" />
      <g stroke="#232327" strokeWidth="1" fill="none">
        {Array.from({ length: 22 }).map((_, i) => <path key={`h${i}`} d={`M0 ${i * 20 + (i % 3) * 4} C 300 ${i * 20 - 14}, 600 ${i * 20 + 18}, 1000 ${i * 20 - 6}`} />)}
        {Array.from({ length: 26 }).map((_, i) => <path key={`v${i}`} d={`M${i * 40} 0 C ${i * 40 + 18} 140, ${i * 40 - 22} 280, ${i * 40 + 8} 420`} />)}
      </g>
      <path d="M0 250 C 120 230, 210 300, 330 262 S 470 170, 520 236 S 640 340, 720 268 S 860 190, 1000 222 L1000 300 C 880 270, 790 330, 700 336 S 560 360, 480 300 S 330 330, 220 340 S 60 300, 0 320 Z" fill="#1a1a1e" stroke="#2f2f35" />
      <path d="M380 240 C 420 220, 470 250, 500 236" stroke="#3a3a40" strokeWidth="6" strokeLinecap="round" />
      {pins.map((p) => (
        <g key={p.label} transform={`translate(${p.x} ${p.y})`}>
          <circle r="18" fill="rgb(201 164 106 / 0.12)" />
          <path d="M0 -14 C 8 -14, 12 -8, 12 -3 C 12 6, 0 14, 0 14 C 0 14, -12 6, -12 -3 C -12 -8, -8 -14, 0 -14 Z" fill="#f6f3ee" />
          <circle cy="-3" r="4" fill="#0f0f11" />
          <text x="20" y="4" fill="#9a968f" fontSize="13" fontFamily="Hanken Grotesk">{p.label}</text>
        </g>
      ))}
      <text x="24" y="400" fill="#4a4a50" fontSize="11" letterSpacing="2" fontFamily="Hanken Grotesk">PLAN INDICATIF — LAGUNE ÉBRIÉ</text>
    </svg>
  );
}

/** Le visiteur peut réactiver (ou couper) les animations sur ce site, quel que soit le réglage système. */
function MotionToggle() {
  const reduced = prefersReducedMotion();
  return (
    <button type="button" className="underline underline-offset-4 hover:text-paper" onClick={() => setMotionChoice(reduced ? 'on' : 'off')}>
      {reduced ? 'Activer les animations' : 'Réduire les animations'}
    </button>
  );
}

export default function Footer() {
  const ref = useGsap(({ reduced, scope }) => {
    if (reduced) return;
    gsap.from(scope.querySelectorAll('[data-col]'), { y: 24, opacity: 0, stagger: 0.08, duration: 0.9, scrollTrigger: { trigger: scope, start: 'top 80%', once: true } });
  });
  const col = 'border-t border-line pt-5';
  return (
    <footer ref={ref} className="border-t border-line bg-ink" aria-labelledby="contacts-title">
      <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-24 sm:px-8">
        <h2 id="contacts-title" className="display text-center text-5xl sm:text-6xl">Contacts</h2>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          <div data-col>
            <p className="flex items-center gap-2.5 text-lg"><Send className="size-4 text-gold" />Pour toute question</p>
            <div className={`${col} mt-4 space-y-1.5 text-sm text-mist`}>
              <p>Téléphone : <a className="text-paper hover:text-gold" href={`tel:${SITE.phone.replace(/\s/g, '')}`}>{SITE.phone}</a></p>
              <p>E-mail : <a className="text-paper hover:text-gold" href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            </div>
          </div>
          <div data-col>
            <p className="flex items-center gap-2.5 text-lg"><Clock className="size-4 text-gold" />Horaires</p>
            <div className={`${col} mt-4 space-y-1.5 text-sm text-mist`}>
              <p>Séances tous les jours, de 13 h 30 à minuit.</p>
              <p>Réservation en ligne ouverte 24 h/24.</p>
            </div>
          </div>
          <div data-col>
            <p className="flex items-center gap-2.5 text-lg"><MapPin className="size-4 text-gold" />Nos adresses</p>
            <div className={`${col} mt-4 space-y-1.5 text-sm text-mist`}>
              <p>{SITE.address}</p>
              <p><Link to="/restaurants" className="text-paper hover:text-gold">Les restaurants partenaires</Link></p>
            </div>
          </div>
        </div>
        <div className="mt-14 overflow-hidden rounded-[4px] border border-line"><LagoonMap /></div>

        <div className="mt-20 grid items-center gap-8 border-t border-line pt-10 md:grid-cols-[1fr_auto_1fr]">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-mist">
            <li><Link className="hover:text-paper" to="/cinema">Cinéma</Link></li>
            <li><Link className="hover:text-paper" to="/restaurants">Restaurants</Link></li>
            <li><Link className="hover:text-paper" to="/a-propos">À propos</Link></li>
            <li><Link className="hover:text-paper" to="/reservation/retrouver">Retrouver une réservation</Link></li>
          </ul>
          <Link to="/" aria-label="MONARQUE, accueil"><Wordmark /></Link>
          <ul className="flex flex-wrap justify-start gap-x-6 gap-y-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-mist md:justify-end">
            {SITE.social.map((s) => (
              <li key={s.name}>{s.url ? <a className="hover:text-paper" href={s.url} target="_blank" rel="noreferrer">{s.name}</a> : <span title="Lien à renseigner dans src/config/site.js">{s.name} (bientôt)</span>}</li>
            ))}
          </ul>
        </div>
        <div className="mt-10 flex flex-wrap justify-between gap-2 text-xs text-mist/70">
          <span>© {new Date().getFullYear()} MONARQUE. Coordonnées et établissements de démonstration.</span>
          <span>Paiements opérés par SycaPay (intégration en attente de la documentation officielle).</span>
          <MotionToggle />
        </div>
      </div>
    </footer>
  );
}
