import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Phone } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import { restaurantService } from '../../services';
import { ErrorState, Img, PageLoader, PriceRange } from '../../components/common';
import RestaurantFloor from '../../components/floor-plan/RestaurantFloor';
import { DAYS, rangesLabel, todayHours } from '../../utils/hours';

export default function RestaurantPage() {
  const { restaurantId } = useParams();
  const { data: r, loading, error, reload } = useAsync(() => restaurantService.get(restaurantId), [restaurantId]);
  const scope = useScrollAnimation([!!r]);
  if (loading && !r) return <div className="pt-32"><PageLoader /></div>;
  if (error) return <div className="pt-32"><ErrorState error={error} onRetry={reload} /></div>;
  const today = new Date().getDay();
  const zones = r.plan.elements.filter((e) => e.type === 'zone');
  const tables = r.plan.elements.filter((e) => e.type === 'table');

  return (
    <div ref={scope}>
      <section className="relative h-[88svh] min-h-[560px] overflow-hidden">
        <div className="absolute inset-0" data-parallax="8"><Img src={r.photos[0]} alt={`Salle du restaurant ${r.name}`} className="h-[116%]" eager sizes="100vw" /></div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/40" />
        <div className="relative mx-auto flex h-full max-w-[1440px] flex-col justify-end px-4 pb-14 sm:px-8">
          <Link to="/restaurants" className="mb-6 inline-flex items-center gap-2 text-sm text-paper/80 hover:text-paper"><ArrowLeft className="size-4" />Tous les restaurants</Link>
          <p className="label text-paper/75">{r.cuisine} · {r.location}</p>
          <h1 data-reveal="lines" className="display mt-3 text-[clamp(3.5rem,11vw,10rem)]">{r.name}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link to={`/restaurants/${r.id}/reserver`} className="btn btn-primary">Choisir ma table <ArrowRight className="size-4" /></Link>
            <span className="text-paper/80">{todayHours(r).label}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-14 px-4 py-20 sm:px-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p data-reveal="lines" className="display-sm text-3xl sm:text-4xl">{r.tagline}</p>
          <p data-reveal="fade" className="mt-6 text-lg text-paper/80">{r.description}</p>
          <div data-reveal="stagger" className="mt-12 grid grid-cols-2 gap-3">
            {r.photos.slice(1).map((p, i) => (
              <div key={p} data-tilt="8" className={`overflow-hidden rounded-[4px] ${i === 0 ? 'mt-12' : ''}`}><Img src={p} alt={`${r.name}, photo ${i + 2}`} className="aspect-[3/4]" /></div>
            ))}
          </div>
        </div>
        <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
          <div className="panel p-6">
            <h2 className="label mb-4">Horaires</h2>
            <ul className="space-y-1.5 text-sm">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <li key={d} className={`flex justify-between gap-4 ${d === today ? 'font-semibold text-paper' : 'text-mist'}`}><span>{DAYS[d]}</span><span className="tabular text-right">{rangesLabel(r.hours[d])}</span></li>
              ))}
            </ul>
          </div>
          <div className="panel p-6 text-sm">
            <h2 className="label mb-4">Informations pratiques</h2>
            <p className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-violet-hi" />{r.address}</p>
            <a className="mt-2 inline-block text-violet-hi underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address)}`} target="_blank" rel="noreferrer">Ouvrir l’itinéraire</a>
            <p className="mt-4 flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-violet-hi" /><a href={`tel:${r.phone.replace(/\s/g, '')}`} className="hover:text-violet-hi">{r.phone}</a></p>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div><dt className="text-mist">Prix</dt><dd><PriceRange value={r.priceRange} /></dd></div>
              <div><dt className="text-mist">Ambiance</dt><dd>{r.ambiance}</dd></div>
              <div><dt className="text-mist">Durée d’un repas</dt><dd>{r.duration} min environ</dd></div>
              <div><dt className="text-mist">Capacité</dt><dd>{tables.length} tables</dd></div>
            </dl>
            {r.conditions && <p className="mt-5 border-t border-line pt-4 text-mist">{r.conditions}</p>}
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pb-24 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 data-reveal="lines" className="display text-5xl sm:text-6xl">Le plan de <em>la maison</em></h2>
            <p className="mt-3 text-mist">{zones.map((z) => z.label).join(' · ')}</p>
          </div>
          <Link to={`/restaurants/${r.id}/reserver`} className="btn btn-primary">Voir les tables libres</Link>
        </div>
        <div className="mt-8 overflow-hidden rounded-[4px] border border-line">
          <RestaurantFloor plan={r.plan} intro={false} height="min(60vh, 560px)" />
        </div>
      </section>
    </div>
  );
}
