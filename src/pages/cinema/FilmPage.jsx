import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import { filmService, sessionService } from '../../services';
import FilmPoster from '../../components/cinema/FilmPoster';
import TrailerButton from '../../components/cinema/TrailerButton';
import { EmptyState, ErrorState, PageLoader } from '../../components/common';
import { addDays, formatDuration, formatLongDate, formatShortDay, formatTime, toDateKey } from '../../utils/format';

export default function FilmPage() {
  const { filmId } = useParams();
  const { data, loading, error, reload } = useAsync(async () => {
    const [film, sessions] = await Promise.all([filmService.get(filmId), sessionService.list({ filmId, from: new Date().toISOString() })]);
    return { film, sessions };
  }, [filmId]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => toDateKey(addDays(new Date(), i))), []);
  const [day, setDay] = useState(days[0]);
  const scope = useScrollAnimation([!!data]);

  if (loading && !data) return <div className="pt-32"><PageLoader /></div>;
  if (error) return <div className="pt-32"><ErrorState error={error} onRetry={reload} /></div>;
  const { film, sessions } = data;
  const daySessions = sessions.filter((s) => toDateKey(s.startsAt) === day);
  const byHall = daySessions.reduce((acc, s) => { (acc[s.hall] ||= []).push(s); return acc; }, {});
  const countByDay = (d) => sessions.filter((s) => toDateKey(s.startsAt) === d).length;

  return (
    <div ref={scope}>
      <section className="relative overflow-hidden pt-28" style={{ background: `linear-gradient(180deg, ${film.poster?.bg || '#121019'} 0%, #08070B 85%)` }}>
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 pb-16 sm:px-8 md:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
          <div data-reveal="mask" data-tilt="8" className="overflow-hidden rounded-[4px] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)]">
            <FilmPoster film={film} />
          </div>
          <div className="flex flex-col justify-end">
            <Link to="/cinema" className="mb-6 inline-flex items-center gap-2 text-sm text-mist hover:text-paper"><ArrowLeft className="size-4" />Programme</Link>
            <p className="label">{film.genres.join(' · ')}</p>
            <h1 data-reveal="lines" className="display mt-3 text-[clamp(3rem,8vw,7.5rem)]">{film.title}</h1>
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div><dt className="text-mist">Durée</dt><dd className="font-semibold">{formatDuration(film.duration)}</dd></div>
              <div><dt className="text-mist">Classification</dt><dd className="font-semibold">{film.rating}</dd></div>
              <div><dt className="text-mist">Sortie</dt><dd className="font-semibold">{formatLongDate(film.releaseDate)}</dd></div>
              <div><dt className="text-mist">Réalisation</dt><dd className="font-semibold">{film.director}</dd></div>
            </dl>
            <p data-reveal="fade" className="mt-6 max-w-2xl text-lg text-paper/85">{film.synopsis}</p>
            {film.cast?.length > 0 && <p className="mt-4 text-sm text-mist">Avec {film.cast.join(', ')}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <TrailerButton film={film} />
              {film.status === 'showing' && <a href="#seances" className="btn btn-primary">Choisir une séance <ArrowRight className="size-4" /></a>}
            </div>
          </div>
        </div>
      </section>

      <section id="seances" className="mx-auto max-w-[1440px] scroll-mt-24 px-4 py-16 sm:px-8">
        <h2 className="display text-5xl sm:text-6xl"><em>Séances</em></h2>
        {film.status === 'coming' ? (
          <p className="mt-6 text-mist">Ce film sort le {formatLongDate(film.releaseDate)}. Les séances seront ouvertes à la réservation une fois programmées.</p>
        ) : (
          <>
            <div role="tablist" aria-label="Jour" className="mt-8 flex gap-2 overflow-x-auto pb-2">
              {days.map((d, i) => (
                <button key={d} type="button" role="tab" aria-selected={day === d} disabled={!countByDay(d)} onClick={() => setDay(d)} className="chip shrink-0 flex-col !min-h-16 !rounded-[4px] !px-4 disabled:opacity-40">
                  <span className="text-xs uppercase">{i === 0 ? 'Auj.' : i === 1 ? 'Demain' : formatShortDay(d).split(' ')[0]}</span>
                  <span className="text-lg font-semibold tabular">{new Date(`${d}T12:00`).getDate()}</span>
                </button>
              ))}
            </div>
            {!daySessions.length ? (
              <div className="mt-8"><EmptyState title="Pas de séance ce jour-là">Choisissez un autre jour dans la liste.</EmptyState></div>
            ) : (
              <div className="mt-10 divide-y divide-line border-y border-line">
                {Object.entries(byHall).map(([hall, list]) => (
                  <div key={hall} className="flex flex-col gap-4 py-6 md:flex-row md:items-center">
                    <div className="md:w-64"><p className="display-sm text-2xl">{hall}</p><p className="text-sm text-mist">{list[0].format}</p></div>
                    <div className="flex flex-wrap gap-3">
                      {list.map((s) => {
                        const full = s.remaining <= 0;
                        const low = !full && s.remaining / s.capacity < 0.15;
                        return (
                          <Link key={s.id} to={full ? '#' : `/cinema/seances/${s.id}`} aria-disabled={full} onClick={(e) => full && e.preventDefault()} className={`group flex min-w-32 flex-col rounded-[4px] border px-4 py-3 transition-colors ${full ? 'cursor-not-allowed border-line opacity-50' : 'border-line hover:border-violet-hi hover:bg-violet/10'}`}>
                            <span className="text-2xl font-semibold tabular">{formatTime(s.startsAt)}</span>
                            <span className="text-xs text-mist">{s.language} · {full ? 'Complet' : `${s.remaining} places`}</span>
                            {low && <span className="mt-1 text-xs font-semibold text-warn">Presque complet</span>}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
