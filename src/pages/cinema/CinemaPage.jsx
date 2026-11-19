import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import { filmService, sessionService } from '../../services';
import FilmPoster from '../../components/cinema/FilmPoster';
import { EmptyState, ErrorState, PageLoader } from '../../components/common';
import { formatDuration, formatLongDate, formatTime } from '../../utils/format';
import { Flip, DUR, EASE, gsap } from '../../animations/animationConfig';

export default function CinemaPage() {
  const [tab, setTab] = useState('showing');
  const [genre, setGenre] = useState('');
  const grid = useRef(null);
  const { data, loading, error, reload } = useAsync(async () => {
    const now = new Date();
    const [films, sessions] = await Promise.all([filmService.list(), sessionService.list({ from: now.toISOString(), to: new Date(now.getTime() + 864e5 * 1.2).toISOString() })]);
    return { films, sessions };
  }, []);
  const scope = useScrollAnimation([!!data]);

  const genres = useMemo(() => [...new Set((data?.films || []).flatMap((f) => f.genres))].sort(), [data]);
  const films = (data?.films || []).filter((f) => f.status === tab && (!genre || f.genres.includes(genre)));

  // Filtrage animé : Flip conserve la position des affiches qui restent.
  const change = (fn) => {
    const state = grid.current ? Flip.getState(grid.current.children) : null;
    fn();
    if (state) requestAnimationFrame(() => grid.current && Flip.from(state, { targets: grid.current.children, duration: DUR.base, ease: EASE.out, onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: DUR.base }) }));
  };

  return (
    <div ref={scope} className="pt-32">
      <header className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <p className="label text-center">Monarque Cinéma · Plateau</p>
        <h1 data-reveal="lines" className="display mt-3 text-center text-[clamp(3.5rem,9vw,8.5rem)]">Le <em>programme</em></h1>
        <div className="mt-10 flex flex-col gap-4 border-y border-line py-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Statut" className="flex gap-2">
            {[['showing', 'À l’affiche'], ['coming', 'Prochainement']].map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className="chip" onClick={() => change(() => setTab(k))}>{l}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Genres">
            <button type="button" className="chip" aria-pressed={!genre} onClick={() => change(() => setGenre(''))}>Tous les genres</button>
            {genres.map((g) => <button key={g} type="button" className="chip" aria-pressed={genre === g} onClick={() => change(() => setGenre(g))}>{g}</button>)}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-4 py-14 sm:px-8">
        {loading && !data ? <PageLoader /> : error ? <ErrorState error={error} onRetry={reload} /> : !films.length ? (
          <EmptyState title="Aucun film ici pour l’instant" action={<button type="button" className="btn btn-ghost" onClick={() => setGenre('')}>Voir tous les genres</button>}>Essayez un autre genre ou l’autre onglet.</EmptyState>
        ) : (
          <div ref={grid} className="grid grid-cols-2 gap-x-5 gap-y-14 md:grid-cols-3 xl:grid-cols-4">
            {films.map((f, i) => {
              const today = data.sessions.filter((s) => s.filmId === f.id && new Date(s.startsAt) > new Date()).slice(0, 4);
              return (
                <article key={f.id} data-flip-id={f.id} className={`group ${i % 4 === 1 ? 'md:mt-16' : ''} ${i % 4 === 3 ? 'xl:mt-16' : ''}`}>
                  <Link to={`/cinema/films/${f.id}`} data-tilt="10" className="block overflow-hidden rounded-[4px]">
                    <FilmPoster film={f} className="transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]" />
                  </Link>
                  <h2 className="display-sm mt-4 text-2xl"><Link to={`/cinema/films/${f.id}`} className="hover:text-violet-hi">{f.title}</Link></h2>
                  <p className="mt-1 text-sm text-mist">{f.genres.join(', ')} · {formatDuration(f.duration)}</p>
                  <p className="text-sm text-mist">{f.rating}</p>
                  {f.status === 'coming' ? (
                    <p className="mt-3 text-sm text-violet-hi">Sortie le {formatLongDate(f.releaseDate)}</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {today.length ? today.map((s) => <Link key={s.id} to={`/cinema/seances/${s.id}`} className="chip tabular !min-h-8 !px-2.5 !text-xs"><Clock className="size-3" />{formatTime(s.startsAt)}</Link>) : <Link to={`/cinema/films/${f.id}`} className="text-sm text-mist underline">Voir les prochains jours</Link>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
