import { forwardRef } from 'react';
import { Logo } from '../common';
import { formatDay, formatPrice, formatTime } from '../../utils/format';

/** Code-barres dérivé de la référence (repère visuel ; la référence fait foi au contrôle). */
function RefBars({ value }) {
  const bits = [...value].flatMap((c) => c.charCodeAt(0).toString(2).padStart(8, '0').split('').map(Number));
  let x = 0;
  return (
    <svg viewBox={`0 0 ${bits.length * 3} 40`} className="h-12 w-full" preserveAspectRatio="none" aria-hidden>
      {bits.map((b, i) => { const w = b ? 2 : 1; const r = <rect key={i} x={x} y="0" width={w} height="40" fill="#08070B" />; x += 3; return r; })}
    </svg>
  );
}

const Ticket = forwardRef(function Ticket({ r }, ref) {
  const s = r.summary || {};
  return (
    <article ref={ref} data-tilt="6" className="ticket mx-auto w-full max-w-md overflow-hidden rounded-[4px] bg-paper text-ink shadow-[0_40px_90px_-30px_rgb(118_40_200/0.6)]" aria-label="Billet électronique">
      <div className="bg-violet-deep px-7 py-6 text-paper">
        <div className="flex items-center justify-between"><Logo /><span className="text-xs font-semibold uppercase tracking-[0.14em] text-paper/70">{r.kind === 'cinema' ? 'Billet' : 'Réservation'}</span></div>
        <p data-ticket-line className="display mt-6 text-4xl leading-none">{s.title}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-7 py-6 text-sm">
        <div data-ticket-line><p className="text-ink/55">Date</p><p className="font-semibold">{formatDay(s.startsAt)}</p></div>
        <div data-ticket-line><p className="text-ink/55">Heure</p><p className="font-semibold tabular">{formatTime(s.startsAt)}</p></div>
        {r.kind === 'cinema' ? (
          <>
            <div data-ticket-line><p className="text-ink/55">Salle</p><p className="font-semibold">{s.hall}</p></div>
            <div data-ticket-line><p className="text-ink/55">Version</p><p className="font-semibold">{s.format} · {s.language}</p></div>
            <div data-ticket-line className="col-span-2"><p className="text-ink/55">Sièges</p><p className="display-sm text-3xl">{r.cinema.seatLabels.join('  ')}</p></div>
          </>
        ) : (
          <>
            <div data-ticket-line><p className="text-ink/55">Table</p><p className="display-sm text-3xl">{r.restaurant.tableLabel}</p></div>
            <div data-ticket-line><p className="text-ink/55">Convives</p><p className="font-semibold">{r.restaurant.party}</p></div>
            <div data-ticket-line className="col-span-2"><p className="text-ink/55">Adresse</p><p className="font-semibold">{s.address}</p></div>
          </>
        )}
        <div data-ticket-line><p className="text-ink/55">Au nom de</p><p className="font-semibold">{r.customer?.name}</p></div>
        <div data-ticket-line><p className="text-ink/55">{r.paymentRequired ? 'Payé' : 'Acompte'}</p><p className="font-semibold tabular">{r.paymentRequired ? formatPrice(r.amount) : 'Aucun'}</p></div>
      </div>
      <div className="relative border-t-2 border-dashed border-ink/20 px-7 pb-6 pt-5">
        <span className="absolute -left-4 -top-4 size-8 rounded-full bg-ink" aria-hidden />
        <span className="absolute -right-4 -top-4 size-8 rounded-full bg-ink" aria-hidden />
        <RefBars value={r.ref} />
        <p className="mt-2 text-center font-mono text-lg font-bold tracking-[0.2em]">{r.ref}</p>
      </div>
    </article>
  );
});

export default Ticket;

/** Fichier .ics pour ajouter la réservation à son agenda. */
export function downloadIcs(r) {
  const s = r.summary;
  const start = new Date(s.startsAt);
  const minutes = r.kind === 'cinema' ? (s.duration || 120) + 15 : r.restaurant.duration;
  const end = new Date(start.getTime() + minutes * 60e3);
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MONARQUE//Reservation//FR', 'BEGIN:VEVENT',
    `UID:${r.id}@monarque`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
    `SUMMARY:${r.kind === 'cinema' ? `${s.title} — ${s.hall}` : `Dîner — ${s.title}`}`,
    `DESCRIPTION:Référence ${r.ref}${r.kind === 'cinema' ? ` · Sièges ${r.cinema.seatLabels.join(' ')}` : ` · Table ${r.restaurant.tableLabel}`}`,
    `LOCATION:${r.kind === 'cinema' ? 'MONARQUE Plateau, Abidjan' : s.address}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `monarque-${r.ref}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
