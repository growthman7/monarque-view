import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronUp, X } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';
import { seatService, reservationService, sessionService } from '../../services';
import SeatMap, { Legend, SEAT_LEGEND } from '../../components/floor-plan/SeatMap';
import Stepper, { CINEMA_STEPS } from '../../components/reservation/Stepper';
import { ErrorState, PageLoader, Spinner } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { SEAT_CATEGORIES } from '../../utils/planGenerators';
import { formatDay, formatPrice, formatTime } from '../../utils/format';
import { flipSummary, rollNumber } from '../../animations/reservationAnimations';
import { shake } from '../../animations/interactionAnimations';

// Three.js n'est chargé que si la vue 3D est ouverte.
const CinemaHall3D = lazy(() => import('../../components/cinema3d/CinemaHall3D'));

/** Si la 3D échoue (chargement, WebGL perdu), on revient au plan 2D plutôt qu'à une page vide. */
class Fallback3D extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.warn('[salle 3D] indisponible :', err); this.props.onFail?.(); }
  render() { return this.state.failed ? null : this.props.children; }
}

const MAX = 8;

export default function SeatSelectionPage() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data: session, loading, error, reload } = useAsync(() => sessionService.get(sessionId), [sessionId]);
  const [avail, setAvail] = useState({ occupied: new Set(), locked: new Set() });
  const [selected, setSelected] = useState(() => new Set());
  const [highlight, setHighlight] = useState(null);
  const webgl = useMemo(() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }, []);
  const [view, setView] = useState(() => (webgl ? '3d' : 'plan'));
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const summaryRef = useRef(null);
  const totalRef = useRef(null);
  const prevTotal = useRef(0);
  const cta = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const a = await seatService.availability(sessionId);
      const occupied = new Set(a.occupied);
      const locked = new Set(a.locked);
      setAvail({ occupied, locked });
      setSelected((sel) => {
        const lost = [...sel].filter((id) => occupied.has(id) || locked.has(id));
        if (!lost.length) return sel;
        toast.info('Un siège vient d’être pris', 'Il a été retiré de votre sélection.');
        const n = new Set(sel);
        lost.forEach((id) => n.delete(id));
        return n;
      });
    } catch { /* l'interrogation suivante réessaiera */ }
  }, [sessionId, toast]);
  useEffect(() => { refresh(); }, [refresh]);
  useLiveRefresh(refresh, { interval: 8000 });

  const seatsById = useMemo(() => Object.fromEntries((session?.plan.elements || []).filter((e) => e.type === 'seat').map((s) => [s.id, s])), [session]);
  const chosen = [...selected].map((id) => seatsById[id]).filter(Boolean).sort((a, b) => a.label.localeCompare(b.label, 'fr', { numeric: true }));
  const total = chosen.reduce((s, x) => s + (session?.prices[x.category] || 0), 0);
  const presentCats = useMemo(() => [...new Set(Object.values(seatsById).map((s) => s.category))], [seatsById]);

  useEffect(() => {
    rollNumber(totalRef.current, prevTotal.current, total, formatPrice);
    prevTotal.current = total;
  }, [total]);

  const toggle = (seat) => {
    flipSummary(summaryRef.current, () => {
      setSelected((sel) => {
        const n = new Set(sel);
        if (n.has(seat.id)) n.delete(seat.id);
        else if (n.size >= MAX) { toast.info(`${MAX} sièges maximum`, 'Pour un groupe plus grand, faites une seconde réservation.'); return sel; }
        else n.add(seat.id);
        return n;
      });
    });
  };

  const proceed = async () => {
    if (!chosen.length) { shake(cta.current); return; }
    setBusy(true);
    try {
      const r = await reservationService.hold({ kind: 'cinema', sessionId, seatIds: chosen.map((s) => s.id) });
      nav(`/reservation/${r.id}/paiement`);
    } catch (e) {
      toast.error('Réservation impossible', e.message);
      if (e.details?.seatIds) setSelected((sel) => { const n = new Set(sel); e.details.seatIds.forEach((id) => n.delete(id)); return n; });
      refresh();
    } finally { setBusy(false); }
  };

  if (loading && !session) return <PageLoader label="Ouverture de la salle…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const started = new Date(session.startsAt) < new Date();

  const Summary = ({ compact }) => (
    <div className="flex flex-col gap-4">
      <div ref={compact ? undefined : summaryRef} className="flex flex-col gap-2" aria-live="polite">
        {!chosen.length && <p className="text-sm text-mist">Touchez un siège libre sur le plan pour l’ajouter.</p>}
        {chosen.map((s) => (
          <div key={s.id} data-flip data-flip-id={s.id} className="flex items-center justify-between gap-3 rounded-[3px] bg-ink-3 px-3 py-2.5">
            <div>
              <p className="font-semibold">Rang {s.properties.row} · Siège {s.properties.number}</p>
              <p className="text-xs text-mist">{SEAT_CATEGORIES[s.category]?.label}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="tabular text-sm">{formatPrice(session.prices[s.category])}</span>
              <button type="button" className="rounded-full p-1 text-mist hover:bg-ink hover:text-paper" aria-label={`Retirer le siège ${s.label}`} onClick={() => toggle(s)}><X className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-baseline justify-between border-t border-line pt-4">
        <span className="text-mist">Total</span>
        <span ref={compact ? undefined : totalRef} className="display-sm tabular text-3xl">{formatPrice(total)}</span>
      </div>
      <button ref={compact ? undefined : cta} type="button" className="btn btn-primary w-full" onClick={proceed} disabled={busy || started}>
        {busy ? <Spinner className="size-4" /> : null}
        {chosen.length ? `Réserver ${chosen.length > 1 ? `ces ${chosen.length} sièges` : 'ce siège'}` : 'Choisissez vos sièges'}
        {!busy && chosen.length > 0 && <ArrowRight className="size-4" />}
      </button>
      <p className="text-xs text-mist">Vos sièges seront bloqués pour vous pendant 8 minutes, le temps de payer.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-40 pt-6 sm:px-8 lg:pb-16">
      <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to={`/cinema/films/${session.film.id}`} className="inline-flex items-center gap-2 text-sm text-mist hover:text-paper"><ArrowLeft className="size-4" />{session.film.title}</Link>
          <h1 className="display mt-2 text-4xl sm:text-5xl">{session.hall.name}</h1>
          <p className="mt-1 text-mist">{formatDay(session.startsAt)} · {formatTime(session.startsAt)} · {session.format} · {session.language}</p>
        </div>
        <Stepper steps={CINEMA_STEPS} current={1} />
      </div>

      {started && <p className="mt-6 rounded-[4px] border border-warn/30 bg-warn/10 p-4 text-sm text-warn">Cette séance a déjà commencé : la réservation en ligne est fermée.</p>}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="Mode d’affichage" className="mr-2 flex rounded-[4px] border border-line p-0.5">
              {[['3d', 'Salle 3D'], ['plan', 'Plan']].map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={view === k} disabled={k === '3d' && !webgl} onClick={() => setView(k)} className={`rounded-[3px] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors disabled:opacity-40 ${view === k ? 'bg-paper text-ink' : 'text-mist hover:text-paper'}`}>{l}</button>
              ))}
            </div>
            {view === 'plan' && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Mettre en avant une catégorie">
                <button type="button" className="chip" aria-pressed={!highlight} onClick={() => setHighlight(null)}>Toutes</button>
                {presentCats.map((c) => (
                  <button key={c} type="button" className="chip" aria-pressed={highlight === c} onClick={() => setHighlight(highlight === c ? null : c)}>
                    {SEAT_CATEGORIES[c].label} · {formatPrice(session.prices[c])}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="overflow-hidden rounded-[4px] border border-line bg-[radial-gradient(ellipse_at_50%_0%,#1d1030_0%,#0d0b12_60%)]">
            {view === '3d' ? (
              <Fallback3D onFail={() => { setView('plan'); toast.info('Salle 3D indisponible', 'Le plan de la salle est affiché à la place.'); }}>
                <Suspense fallback={<div className="grid h-[min(72vh,680px)] min-h-[420px] place-items-center text-sm text-mist">Ouverture des portes de la salle…</div>}>
                  <CinemaHall3D plan={session.plan} occupied={avail.occupied} locked={avail.locked} selected={selected} onToggle={toggle} prices={session.prices} film={session.film} interactive={!started} />
                </Suspense>
              </Fallback3D>
            ) : (
              <SeatMap plan={session.plan} occupied={avail.occupied} locked={avail.locked} selected={selected} onToggle={toggle} prices={session.prices} highlight={highlight} interactive={!started} />
            )}
          </div>
          {view === '3d' ? (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-mist" aria-label="Légende de la salle 3D">
              {[['#4a1f73', 'Standard'], ['#7628c8', 'Premium'], ['#a8844a', 'VIP'], ['#e9d5ff', 'Votre sélection'], ['#26252b', 'Réservé (carton blanc posé)'], ['#6a5220', 'En cours de réservation']].map(([c, l]) => (
                <li key={l} className="flex items-center gap-2"><span className="size-3 rounded-[2px]" style={{ background: c }} />{l}</li>
              ))}
            </ul>
          ) : <Legend items={SEAT_LEGEND} className="mt-4" />}
        </div>

        <aside className="hidden lg:block">
          <div className="panel sticky top-24 p-6">
            <p className="label mb-4">Votre sélection</p>
            <Summary />
          </div>
        </aside>
      </div>

      {/* Mobile : barre récapitulative en bas, extensible */}
      <div className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink-2/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
        <button type="button" className="flex w-full items-center justify-between py-1" onClick={() => setSheet((v) => !v)} aria-expanded={sheet}>
          <span className="text-sm">{chosen.length ? `${chosen.length} siège${chosen.length > 1 ? 's' : ''} · ${chosen.map((s) => s.label).join(', ')}` : 'Aucun siège choisi'}</span>
          <span className="flex items-center gap-2 font-semibold tabular">{formatPrice(total)}<ChevronUp className={`size-4 transition-transform ${sheet ? 'rotate-180' : ''}`} /></span>
        </button>
        {sheet ? <div className="mt-3 max-h-[55vh] overflow-auto"><Summary compact /></div> : (
          <button type="button" className="btn btn-primary mt-2 w-full" onClick={proceed} disabled={busy || started || !chosen.length}>
            {busy ? <Spinner className="size-4" /> : 'Continuer'}
          </button>
        )}
      </div>
    </div>
  );
}
