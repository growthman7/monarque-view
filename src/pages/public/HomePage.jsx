import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useGsap } from '../../hooks/useGsap';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import { filmService, restaurantService, sessionService } from '../../services';
import { PHOTOS, unsplash } from '../../services/demo/seed';
import { marquee } from '../../animations/scrollAnimations';
import { magnetic } from '../../animations/interactionAnimations';
import { EASE, ScrollTrigger, SplitText, gsap, isLowPower } from '../../animations/animationConfig';
import FilmPoster from '../../components/cinema/FilmPoster';
import Walkthrough from '../../components/experience/Walkthrough';
import { DemoTag, Img } from '../../components/common';
import { formatDuration, formatShortDay, formatTime } from '../../utils/format';

/* ───────── Hero : la salle vue d'en haut, en demi-disque, comme l'objet rond du modèle ───────── */
function SeatArc() {
  const seats = useMemo(() => {
    const out = [];
    const cx = 500; const cy = 560;
    for (let r = 0; r < 9; r += 1) {
      const radius = 170 + r * 44;
      const count = Math.floor((Math.PI * radius) / 30);
      for (let i = 1; i < count; i += 1) {
        const a = Math.PI + (i / count) * Math.PI;
        if (Math.abs(a - 1.5 * Math.PI) < 0.05) continue; // allée centrale
        const key = `${r}-${i}`;
        const h = (r * 31 + i * 17) % 23;
        out.push({ key, x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, rot: (a * 180) / Math.PI + 90, state: key === '7-13' ? 'mine' : h < 6 ? 'taken' : r === 8 ? 'vip' : 'free' });
      }
    }
    return out;
  }, []);
  const mine = seats.find((s) => s.state === 'mine');
  return (
    <svg viewBox="0 0 1000 560" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="arcGlow" cx="50%" cy="100%" r="60%"><stop offset="0" stopColor="#c9a46a" stopOpacity="0.16" /><stop offset="1" stopColor="#c9a46a" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="500" cy="560" r="560" fill="url(#arcGlow)" />
      <circle cx="500" cy="560" r="540" fill="none" stroke="#2c2c30" />
      <path d="M380 560 A 120 120 0 0 1 620 560" fill="none" stroke="#f6f3ee" strokeWidth="3" opacity="0.8" />
      <text x="500" y="540" textAnchor="middle" fill="#9a968f" fontSize="11" letterSpacing="6" fontFamily="Hanken Grotesk">ÉCRAN</text>
      {seats.map((s) => (
        <rect key={s.key} x={s.x - 10} y={s.y - 8} width="20" height="16" rx="4" transform={`rotate(${s.rot} ${s.x} ${s.y})`}
          fill={s.state === 'mine' ? '#f6f3ee' : s.state === 'taken' ? '#161618' : s.state === 'vip' ? 'rgb(201 164 106 / 0.18)' : '#1f1f23'}
          stroke={s.state === 'mine' ? '#a855f7' : s.state === 'taken' ? '#202024' : s.state === 'vip' ? '#c9a46a' : '#3d3d43'} strokeWidth="1.2" />
      ))}
      {mine && (
        <g transform={`translate(${mine.x} ${mine.y})`}>
          <circle r="22" fill="none" stroke="#a855f7" strokeWidth="1.5" opacity="0.7" />
          <line x1="16" y1="-16" x2="56" y2="-56" stroke="#f6f3ee" strokeWidth="1" />
          <text x="62" y="-60" fill="#f6f3ee" stroke="#0a0a0b" strokeWidth="6" paintOrder="stroke" fontSize="24" fontStyle="italic" fontFamily="Bodoni Moda">Rang F, siège 12</text>
        </g>
      )}
    </svg>
  );
}

function Hero() {
  const root = useRef(null);
  const arc = useRef(null);
  const cta = useRef(null);
  useGsap(({ reduced, scope }) => {
    gsap.set(scope, { autoAlpha: 1 });
    if (reduced) return;
    const title = scope.querySelector('h1');
    const split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    gsap.timeline({ defaults: { ease: EASE.out } })
      .from(split.lines, { yPercent: 115, duration: 1.3, stagger: 0.12 }, 0.15)
      .from(scope.querySelector('[data-sub]'), { y: 16, opacity: 0, duration: 1 }, 0.6)
      .from(arc.current, { yPercent: 40, rotate: -18, opacity: 0, duration: 2, ease: EASE.inOut }, 0.2)
      .from(cta.current, { scale: 0.6, opacity: 0, duration: 1 }, 1);
    if (!isLowPower()) {
      gsap.to(arc.current, { rotate: 14, yPercent: 10, ease: 'none', scrollTrigger: { trigger: scope, start: 'top top', end: 'bottom top', scrub: true } });
    }
  }, [], root);
  useEffect(() => magnetic(cta.current, 0.25), []);

  return (
    <section ref={root} className="invisible relative flex min-h-[100svh] flex-col items-center overflow-hidden bg-ink px-4 pt-36 text-center sm:pt-40" aria-label="Bienvenue chez MONARQUE">
      <h1 className="display text-[clamp(3.2rem,8.4vw,8rem)] leading-[0.98]"><em>Votre place,</em><br />au cinéma et à table</h1>
      <p data-sub className="mt-7 max-w-md text-sm leading-relaxed text-paper/75 sm:text-base">Le siège exact dans la salle, la table exacte au restaurant. Vous choisissez sur le plan, avant d’arriver.</p>
      <div data-sub className="mt-8 flex flex-wrap justify-center gap-6">
        <Link to="/cinema" className="link-arrow text-paper">Le cinéma <ArrowUpRight className="size-4" /></Link>
        <Link to="/restaurants" className="link-arrow text-paper">Les restaurants <ArrowUpRight className="size-4" /></Link>
      </div>
      <Link ref={cta} to="/cinema" className="btn-round absolute right-[6%] top-[52%] hidden md:grid"><span className="flex items-center gap-1.5">Réserver <ArrowRight className="size-3.5" /></span></Link>
      <div ref={arc} className="pointer-events-none mt-auto w-[min(1100px,140vw)] translate-y-[2%] origin-bottom">
        <SeatArc />
      </div>
    </section>
  );
}

/* ───────── Section claire : titre avec vignettes photo incrustées ───────── */
function Statement() {
  return (
    <section className="on-cream bg-cream text-cream-ink" aria-labelledby="statement-title">
      <div className="mx-auto max-w-[1200px] px-4 pb-16 pt-24 text-center sm:px-8 sm:pt-32">
        <h2 id="statement-title" data-reveal="fade" className="display text-[clamp(2.2rem,5.2vw,4.6rem)] leading-[1.12]">
          <em>Un film,</em> qu’on n’oublie pas, <span className="pill-img"><img src={unsplash(PHOTOS.cinemaAisle, 400)} alt="" loading="lazy" /></span>
          <br className="hidden md:block" />
          <span className="pill-img"><img src={unsplash('1414235077428-338989a2e8c0', 400)} alt="" loading="lazy" /></span> <em>une table,</em> où l’on revient.
        </h2>
        <p data-reveal="fade" className="mx-auto mt-8 max-w-lg text-sm leading-relaxed text-cream-ink/70 sm:text-base">Chaque salle et chaque restaurant partenaire s’ouvre sur son plan réel. Vous voyez ce qui est libre, vous choisissez, et la place est à vous pendant que vous payez.</p>
      </div>
      <div className="mx-auto max-w-[1440px] px-4 pb-24 sm:px-8">
        <div data-reveal="mask" className="relative h-[52vh] min-h-[320px] overflow-hidden rounded-[4px] sm:h-[72vh]">
          <div className="absolute inset-0" data-parallax="7"><Img src={unsplash('1517248135467-4c7edcad34c4', 2000)} alt="Salle du restaurant Le Velours" className="h-[114%] w-full" sizes="100vw" /></div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-cream-ink/15 pt-8 sm:flex-row">
          <p className="max-w-sm text-sm text-cream-ink/70">Trois salles au Plateau, cinq maisons partenaires à Abidjan.</p>
          <div className="flex gap-3">
            <Link to="/cinema" className="btn btn-ghost">Le programme</Link>
            <Link to="/restaurants" className="btn btn-primary">Réserver une table</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Carrousel « À l'affiche » avec barre de progression et flèches ───────── */
function NowShowing({ films, sessions }) {
  const track = useRef(null);
  const bar = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      const p = max > 0 ? el.scrollLeft / max : 1;
      gsap.to(bar.current, { scaleX: Math.max(0.12, p), duration: 0.4, ease: EASE.out, overwrite: true });
      setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft > max - 8 });
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [films.length]);
  const step = (dir) => {
    const el = track.current;
    const card = el.querySelector('article');
    el.scrollBy({ left: dir * ((card?.offsetWidth || 300) + 24), behavior: 'smooth' });
  };
  return (
    <section className="bg-ink py-24 sm:py-32" aria-labelledby="affiche-title">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <div className="flex items-center gap-6">
          <div className="h-px flex-1 bg-line"><div ref={bar} className="h-px origin-left scale-x-[0.12] bg-paper" /></div>
          <div className="flex gap-3">
            <button type="button" className="p-1 text-paper disabled:opacity-30" onClick={() => step(-1)} disabled={edge.start} aria-label="Films précédents"><ArrowLeft className="size-5" /></button>
            <button type="button" className="p-1 text-paper disabled:opacity-30" onClick={() => step(1)} disabled={edge.end} aria-label="Films suivants"><ArrowRight className="size-5" /></button>
          </div>
        </div>
        <div className="mt-14 text-center">
          <h2 id="affiche-title" data-reveal="lines" className="display text-[clamp(2.8rem,6vw,5.5rem)]">À l’<em>affiche</em></h2>
          <p data-reveal="fade" className="mx-auto mt-5 max-w-md text-sm text-mist">Chaque séance s’ouvre sur le plan de sa salle. Les sièges déjà pris sont visibles avant même de commencer.</p>
        </div>
      </div>
      <div ref={track} className="mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-px-4 px-4 pb-4 [scrollbar-width:none] sm:scroll-px-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
        {films.map((f) => {
          const next = sessions.filter((s) => s.filmId === f.id && new Date(s.startsAt) > new Date()).slice(0, 3);
          return (
            <article key={f.id} className="group w-[72vw] max-w-[20rem] shrink-0 snap-start sm:w-[40vw] lg:w-[22vw]">
              <Link to={`/cinema/films/${f.id}`} data-tilt="10" className="block overflow-hidden rounded-[4px]" aria-label={`${f.title}, fiche du film`}>
                <FilmPoster film={f} className="transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]" />
              </Link>
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <h3 className="display-sm text-xl"><Link to={`/cinema/films/${f.id}`}>{f.title}</Link></h3>
                <Link to={next[0] ? `/cinema/seances/${next[0].id}` : `/cinema/films/${f.id}`} className="link-arrow shrink-0 text-paper">Réserver <ArrowUpRight className="size-3.5" /></Link>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-mist">{f.genres.join(', ')} · {formatDuration(f.duration)} · {f.rating}</p>
              {next.length > 0 && <p className="mt-1 text-xs text-mist">Prochaines : {next.map((s) => `${formatShortDay(s.startsAt)} ${formatTime(s.startsAt)}`).join(' · ')}</p>}
            </article>
          );
        })}
        <div className="w-px shrink-0" />
      </div>
    </section>
  );
}

/* ───────── « Les tables du moment » : filtres fins + mosaïque décalée ───────── */
function Tables({ restaurants }) {
  const [cuisine, setCuisine] = useState('');
  const cuisines = [...new Set(restaurants.map((r) => r.cuisine))];
  const list = restaurants.filter((r) => !cuisine || r.cuisine === cuisine);
  const cols = [0, 1, 2].map((c) => list.filter((_, i) => i % 3 === c));
  const grid = useRef(null);
  useEffect(() => { ScrollTrigger.refresh(); }, [cuisine]);
  return (
    <section className="bg-ink pb-28" aria-labelledby="tables-title">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <div className="relative text-center">
          <h2 id="tables-title" data-reveal="lines" className="display text-[clamp(2.8rem,6vw,5.5rem)]">Les tables <em>du moment</em></h2>
          <Link to="/restaurants" className="link-arrow mt-4 text-paper md:absolute md:right-0 md:top-1/2 md:mt-0">Tous les restaurants <ArrowUpRight className="size-3.5" /></Link>
        </div>
        <div className="mt-10 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]" role="group" aria-label="Filtrer par cuisine">
          <button type="button" className="chip shrink-0" aria-pressed={!cuisine} onClick={() => setCuisine('')}>Toutes les cuisines</button>
          {cuisines.map((c) => <button key={c} type="button" className="chip shrink-0" aria-pressed={cuisine === c} onClick={() => setCuisine(c)}>{c}</button>)}
        </div>
        <div ref={grid} className="mt-10 grid gap-6 md:grid-cols-3">
          {cols.map((col, ci) => (
            <div key={ci} className={`flex flex-col gap-6 ${ci === 1 ? 'md:pt-40' : ci === 2 ? 'md:pt-12' : ''}`}>
              {col.map((r, i) => (
                <article key={r.id} className="group">
                  <Link to={`/restaurants/${r.id}`} data-tilt="6" className="block overflow-hidden rounded-[4px]">
                    <Img src={r.photos[(ci + i) % r.photos.length]} alt={`${r.name}, ${r.cuisine}`} className={ci === 2 && i === 0 ? 'aspect-[3/4]' : 'aspect-[4/3.4]'} imgClassName="transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-105" />
                  </Link>
                  <h3 className="display-sm mt-4 text-2xl">{r.name}</h3>
                  <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-mist">{r.tagline}</p>
                  <p className="mt-1 text-xs text-mist">{r.cuisine} · {r.location}</p>
                  <Link to={`/restaurants/${r.id}`} className="link-arrow mt-3 text-paper">Découvrir <ArrowUpRight className="size-3.5" /></Link>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── « La maison » : photo à gauche, texte et signature à droite ───────── */
function House() {
  return (
    <section className="border-t border-line bg-ink py-24 sm:py-32" aria-labelledby="house-title">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
        <h2 id="house-title" data-reveal="lines" className="display text-center text-[clamp(2.8rem,6vw,5.5rem)]">La <em>maison</em></h2>
        <div className="mt-16 grid items-center gap-12 md:grid-cols-[1.05fr_1fr] md:gap-16">
          <div data-reveal="mask" data-tilt="5" className="relative overflow-hidden rounded-[4px]">
            <Img src={unsplash(PHOTOS.cinemaScreen, 1400)} alt="Salle de cinéma face à l’écran" className="aspect-[4/4.4]" />
          </div>
          <div>
            <p className="text-2xl">Une place n’est jamais un détail</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-mist">MONARQUE · Abidjan</p>
            <p data-reveal="fade" className="mt-8 text-sm leading-relaxed text-paper/75">Au cinéma, deux rangs d’écart changent un film. Au restaurant, une table près de l’eau change une soirée. MONARQUE réunit des salles et des maisons qui acceptent de montrer leur plan réel, dessiné par elles-mêmes.</p>
            <p data-reveal="fade" className="mt-4 text-sm leading-relaxed text-paper/75">Votre sélection est bloquée pour vous pendant le paiement. Si vous abandonnez, elle se libère d’elle-même quelques minutes plus tard.</p>
            <p className="mt-10 font-display text-5xl italic text-gold" aria-hidden>Monarque</p>
            <Link to="/a-propos" className="link-arrow mt-8 text-paper">Notre histoire <ArrowUpRight className="size-3.5" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Offers() {
  const offers = [
    { k: 'Cinéma', t: 'Mardi Monarque', d: 'Toutes les séances avant 18 h au tarif Standard, quelle que soit la catégorie du siège.' },
    { k: 'Combiné', t: 'Dîner et séance', d: 'Une table au Velours à 19 h, deux fauteuils Premium en Salle Impériale à 21 h 45.' },
    { k: 'Restaurant', t: 'Le ponton privé', d: 'La Terrasse Lagune pour huit à douze convives, acompte déduit de l’addition.' },
  ];
  return (
    <section className="border-t border-line bg-ink py-24" aria-labelledby="offers-title">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
        <div className="text-center">
          <h2 id="offers-title" data-reveal="lines" className="display text-[clamp(2.4rem,5vw,4.5rem)]">Les <em>offres</em></h2>
          <DemoTag className="mt-4">Offres de démonstration</DemoTag>
        </div>
        <div data-reveal="stagger" className="mt-14 grid gap-10 md:grid-cols-3">
          {offers.map((o) => (
            <article key={o.t} data-tilt="5" className="border-t border-line pt-5">
              <p className="label">{o.k}</p>
              <h3 className="display-sm mt-3 text-3xl">{o.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-mist">{o.d}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Bande photos + bandeau défilant en italique or ───────── */
function Gallery() {
  const track = useRef(null);
  useGsap(({ reduced }) => (reduced ? undefined : marquee(track.current, { speed: 50 })), [], track);
  const pics = ['1424847651672-bf20a4b0982b', '1600891964599-f61ba0e24092', PHOTOS.reels, '1514933651103-005eec06c04b', '1466978913421-dad2ebd01d17'];
  const words = [['Bonne séance', PHOTOS.cinemaAisle], ['Bon appétit', '1565299624946-b28f40a0ae38'], ['Monarque', PHOTOS.projector]];
  const row = (
    <div className="flex shrink-0 items-center">
      {words.map(([w, img]) => (
        <span key={w} className="flex items-center whitespace-nowrap">
          <span className="pill-img mx-6 !h-[0.8em] !w-[1.9em]"><img src={unsplash(img, 300)} alt="" /></span>
          <span className={`display text-[clamp(3rem,7vw,6.5rem)] ${w === 'Monarque' ? 'text-paper' : 'italic text-gold'}`}>{w}</span>
        </span>
      ))}
    </div>
  );
  return (
    <section className="border-t border-line bg-ink pt-24" aria-labelledby="gallery-title">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <h2 id="gallery-title" data-reveal="lines" className="display text-center text-[clamp(2.4rem,5vw,4.5rem)]">Un soir chez <em>Monarque</em></h2>
        <p className="mx-auto mt-5 max-w-md text-center text-sm text-mist">Les salles, les assiettes et les terrasses de nos maisons partenaires.</p>
        <div data-reveal="stagger" className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-5">
          {pics.map((p, i) => <div key={p} data-tilt="10" className={i === 4 ? 'hidden md:block' : ''}><Img src={unsplash(p, 700)} alt="" className="aspect-[3/4] rounded-[4px]" /></div>)}
        </div>
      </div>
      <div className="mt-16 overflow-hidden py-6" aria-hidden><div ref={track} className="marquee-track">{row}{row}</div></div>
    </section>
  );
}

export default function HomePage() {
  const { data } = useAsync(async () => {
    const now = new Date();
    const [films, restaurants, sessions] = await Promise.all([
      filmService.list(), restaurantService.list(),
      sessionService.list({ from: now.toISOString(), to: new Date(now.getTime() + 3 * 864e5).toISOString() }),
    ]);
    return { films: films.filter((f) => f.status === 'showing'), restaurants, sessions };
  }, []);
  const scope = useScrollAnimation([!!data]);
  useEffect(() => { if (data) requestAnimationFrame(() => ScrollTrigger.refresh()); }, [data]);
  return (
    <div ref={scope}>
      <Hero />
      <Statement />
      <Walkthrough />
      {data ? (
        <>
          <NowShowing films={data.films} sessions={data.sessions} />
          <Tables restaurants={data.restaurants} />
        </>
      ) : <div className="h-[60vh]" />}
      <House />
      <Offers />
      <Gallery />
    </div>
  );
}
