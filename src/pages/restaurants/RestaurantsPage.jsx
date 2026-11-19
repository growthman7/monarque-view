import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, MapPin, Users } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import { restaurantService } from '../../services';
import { EmptyState, ErrorState, Img, PageLoader, PriceRange } from '../../components/common';
import { Flip, DUR, EASE, gsap } from '../../animations/animationConfig';
import { todayHours } from '../../utils/hours';

export default function RestaurantsPage() {
  const { data, loading, error, reload } = useAsync(() => restaurantService.list(), []);
  const [cuisine, setCuisine] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [openNow, setOpenNow] = useState(false);
  const list = useRef(null);
  const scope = useScrollAnimation([!!data]);

  const cuisines = useMemo(() => [...new Set((data || []).map((r) => r.cuisine))].sort(), [data]);
  const locations = useMemo(() => [...new Set((data || []).map((r) => r.location))].sort(), [data]);
  const filtered = (data || []).filter((r) => (!cuisine || r.cuisine === cuisine) && (!location || r.location === location) && (!price || r.priceRange <= Number(price)) && (!openNow || todayHours(r).openNow));

  const change = (fn) => {
    const state = list.current ? Flip.getState(list.current.children) : null;
    fn();
    if (state) requestAnimationFrame(() => list.current && Flip.from(state, { targets: list.current.children, duration: DUR.base, ease: EASE.out, onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: DUR.base }) }));
  };
  const reset = () => change(() => { setCuisine(''); setLocation(''); setPrice(''); setOpenNow(false); });

  return (
    <div ref={scope} className="pt-32">
      <header className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <p className="label text-center">Monarque Restaurants · Abidjan</p>
        <h1 data-reveal="lines" className="display mt-3 text-center text-[clamp(3.5rem,9vw,8.5rem)]">Les <em>tables</em></h1>
        <div className="mt-10 grid gap-3 border-y border-line py-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
          <label className="sr-only" htmlFor="f-cuisine">Cuisine</label>
          <select id="f-cuisine" className="field" value={cuisine} onChange={(e) => change(() => setCuisine(e.target.value))}>
            <option value="">Toutes les cuisines</option>
            {cuisines.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="sr-only" htmlFor="f-loc">Quartier</label>
          <select id="f-loc" className="field" value={location} onChange={(e) => change(() => setLocation(e.target.value))}>
            <option value="">Tous les quartiers</option>
            {locations.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="sr-only" htmlFor="f-price">Budget</label>
          <select id="f-price" className="field" value={price} onChange={(e) => change(() => setPrice(e.target.value))}>
            <option value="">Tous les budgets</option>
            <option value="2">Jusqu’à FF</option>
            <option value="3">Jusqu’à FFF</option>
          </select>
          <button type="button" className="chip !min-h-[2.875rem] justify-center !rounded-[3px]" aria-pressed={openNow} onClick={() => change(() => setOpenNow((v) => !v))}><Clock className="size-4" />Ouvert maintenant</button>
          <button type="button" className="btn btn-ghost" onClick={reset}>Réinitialiser</button>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-4 py-14 sm:px-8">
        {loading && !data ? <PageLoader /> : error ? <ErrorState error={error} onRetry={reload} /> : !filtered.length ? (
          <EmptyState title="Aucun restaurant ne correspond" action={<button type="button" className="btn btn-ghost" onClick={reset}>Effacer les filtres</button>}>Élargissez la cuisine, le quartier ou le budget.</EmptyState>
        ) : (
          <div ref={list} className="flex flex-col gap-24">
            {filtered.map((r, i) => {
              const h = todayHours(r);
              return (
                <article key={r.id} data-flip-id={r.id} className={`grid items-center gap-8 lg:grid-cols-12 ${i % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                  <Link to={`/restaurants/${r.id}`} data-tilt="5" className="group relative block overflow-hidden rounded-[4px] lg:col-span-7" data-reveal="mask">
                    <Img src={r.photos[0]} alt={`Salle du restaurant ${r.name}`} className="aspect-[4/3]" imgClassName="transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-105" />
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      {r.photos.slice(1, 3).map((p) => <Img key={p} src={p.replace('w=1600', 'w=400')} alt="" className="hidden size-20 rounded-[4px] border-2 border-ink sm:block" />)}
                    </div>
                  </Link>
                  <div className="lg:col-span-5">
                    <p className="label">{r.cuisine}</p>
                    <h2 className="display mt-3 text-5xl sm:text-6xl"><Link to={`/restaurants/${r.id}`} className="hover:text-violet-hi">{r.name}</Link></h2>
                    <p className="mt-4 text-lg text-paper/85">{r.tagline}</p>
                    <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                      <div><dt className="text-mist">Quartier</dt><dd className="mt-0.5 flex items-center gap-1.5"><MapPin className="size-3.5 text-violet-hi" />{r.location}</dd></div>
                      <div><dt className="text-mist">Prix</dt><dd className="mt-0.5"><PriceRange value={r.priceRange} /></dd></div>
                      <div><dt className="text-mist">Aujourd’hui</dt><dd className={`mt-0.5 ${h.openNow ? 'text-ok' : ''}`}>{h.label}</dd></div>
                      <div><dt className="text-mist">Capacité</dt><dd className="mt-0.5 flex items-center gap-1.5"><Users className="size-3.5 text-violet-hi" />{r.tableCount} tables · {r.seatCount} couverts</dd></div>
                      <div className="col-span-2"><dt className="text-mist">Ambiance</dt><dd className="mt-0.5">{r.ambiance}</dd></div>
                    </dl>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <Link to={`/restaurants/${r.id}`} className="btn btn-light">Découvrir <ArrowUpRight className="size-4" /></Link>
                      <Link to={`/restaurants/${r.id}/reserver`} className="btn btn-primary">Choisir ma table</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
