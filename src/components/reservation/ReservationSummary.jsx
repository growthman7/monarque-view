import { CalendarDays, MapPin, Users } from 'lucide-react';
import FilmPoster from '../cinema/FilmPoster';
import { Img, StatusBadge } from '../common';
import { formatDay, formatPrice, formatTime } from '../../utils/format';

export default function ReservationSummary({ r, showStatus = false }) {
  const s = r.summary || {};
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-4">
        {r.kind === 'cinema'
          ? <div className="w-20 shrink-0 overflow-hidden rounded-[3px]"><FilmPoster film={{ title: s.title, poster: s.poster, genres: [], director: '' }} showLabel={false} /></div>
          : <Img src={s.photo?.replace('w=1600', 'w=300')} alt="" className="size-20 shrink-0 rounded-[3px]" />}
        <div className="min-w-0">
          <p className="label">{r.kind === 'cinema' ? 'Séance' : 'Restaurant'}</p>
          <p className="display-sm mt-1 text-2xl">{s.title}</p>
          {showStatus && <div className="mt-2"><StatusBadge status={r.status} /></div>}
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-2"><CalendarDays className="size-4 text-violet-hi" />{formatDay(s.startsAt)} · {formatTime(s.startsAt)}</li>
        {r.kind === 'cinema' ? (
          <li className="flex items-center gap-2"><MapPin className="size-4 text-violet-hi" />{s.hall} · {s.format} · {s.language}</li>
        ) : (
          <>
            <li className="flex items-center gap-2"><Users className="size-4 text-violet-hi" />{r.restaurant.party} personne{r.restaurant.party > 1 ? 's' : ''} · Table {r.restaurant.tableLabel}{r.restaurant.zone ? ` · ${r.restaurant.zone}` : ''}</li>
            <li className="flex items-center gap-2"><MapPin className="size-4 text-violet-hi" />{s.address}</li>
          </>
        )}
      </ul>
      {r.kind === 'cinema' && (
        <div className="flex flex-wrap gap-1.5">
          {r.cinema.seatLabels.map((l) => <span key={l} className="rounded-lg bg-violet/20 px-2.5 py-1 text-sm font-semibold text-violet-hi">{l}</span>)}
        </div>
      )}
      <div className="border-t border-line pt-4">
        {r.lines.map((l, i) => <p key={i} className="flex justify-between text-sm text-mist"><span>{l.label}</span><span className="tabular">{formatPrice(l.amount)}</span></p>)}
        <p className="mt-3 flex items-baseline justify-between">
          <span>{r.paymentRequired ? 'Total' : 'À régler en ligne'}</span>
          <span className="display-sm tabular text-2xl">{formatPrice(r.amount)}</span>
        </p>
        {!r.paymentRequired && <p className="mt-1 text-xs text-mist">Aucun acompte demandé pour cette table : l’addition se règle sur place.</p>}
      </div>
    </div>
  );
}
