import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Minus, Plus, Sparkles, Users } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';
import { reservationService, restaurantService, tableService } from '../../services';
import RestaurantFloor, { Legend, TABLE_LEGEND, TABLE_STATE_LABEL } from '../../components/floor-plan/RestaurantFloor';
import Stepper, { RESTAURANT_STEPS } from '../../components/reservation/Stepper';
import { ErrorState, PageLoader, Spinner } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { addDays, formatDay, formatPrice, formatShortDay, toDateKey } from '../../utils/format';
import { slidePanel } from '../../animations/restaurantAnimations';
import { prefersReducedMotion } from '../../animations/animationConfig';

function TableInfo({ table, state, zone, party, onBook, onPick, busy }) {
  const ref = useRef(null);
  useLayoutEffect(() => { const t = slidePanel(ref.current, { reduced: prefersReducedMotion() }); return () => t?.kill(); }, [table?.id]);
  if (!table) {
    return (
      <div className="flex flex-col gap-3 text-sm text-mist">
        <p className="display-sm text-2xl text-paper">Choisissez une table</p>
        <p>Les tables en blanc acceptent un groupe de {party}. Touchez une table pour voir sa zone, ses particularités et ses conditions.</p>
      </div>
    );
  }
  const deposit = table.properties?.deposit || 0;
  const bookable = state === 'available' || state === 'selected';
  return (
    <div ref={ref} className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label">{zone?.label || 'Hors zone'}</p>
          <p className="display mt-1 text-5xl">Table {table.label}</p>
        </div>
        <span className={`mt-1 rounded-full px-2.5 py-1 text-xs font-semibold ${bookable ? 'bg-ok/15 text-ok' : 'bg-ink-3 text-mist'}`}>{TABLE_STATE_LABEL[state] || '—'}</span>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-mist">Capacité</dt><dd className="mt-0.5 flex items-center gap-1.5 font-semibold"><Users className="size-4 text-violet-hi" />{table.capacity} personnes</dd></div>
        <div><dt className="text-mist">Forme</dt><dd className="mt-0.5 font-semibold">{{ round: 'Ronde', square: 'Carrée', rect: 'Rectangulaire' }[table.properties?.shape] || '—'}</dd></div>
        <div><dt className="text-mist">Minimum</dt><dd className="mt-0.5 font-semibold">{table.properties?.minParty || 1} convive{(table.properties?.minParty || 1) > 1 ? 's' : ''}</dd></div>
        <div><dt className="text-mist">Acompte</dt><dd className="mt-0.5 font-semibold">{deposit ? formatPrice(deposit) : 'Aucun'}</dd></div>
      </dl>
      {table.properties?.features?.length > 0 && (
        <ul className="flex flex-wrap gap-2">{table.properties.features.map((f) => <li key={f} className="flex items-center gap-1.5 rounded-full bg-ink-3 px-3 py-1 text-xs"><Sparkles className="size-3 text-violet-hi" />{f}</li>)}</ul>
      )}
      {deposit > 0 && <p className="rounded-[3px] border border-violet/40 bg-violet/10 p-3 text-xs text-paper/85">Cette table demande un acompte de {formatPrice(deposit)}, déduit de l’addition. Il est réglé en ligne pour confirmer.</p>}
      {state === 'selected' ? (
        <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={onBook}>
          {busy ? <Spinner className="size-4" /> : <>Réserver la table {table.label}<ArrowRight className="size-4" /></>}
        </button>
      ) : state === 'available' ? (
        <button type="button" className="btn btn-light w-full" onClick={() => onPick(table)}>Choisir cette table</button>
      ) : (
        <p className="text-sm text-mist">{state === 'too_small' ? `Cette table accueille ${table.capacity} personnes au maximum.` : state === 'min_party' ? `Cette table est réservée aux groupes d’au moins ${table.properties.minParty}.` : 'Cette table n’est pas libre sur ce créneau. Essayez une autre heure.'}</p>
      )}
    </div>
  );
}

export default function TableSelectionPage() {
  const { restaurantId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data: rest, loading, error, reload } = useAsync(() => restaurantService.get(restaurantId), [restaurantId]);
  const days = useMemo(() => Array.from({ length: 21 }, (_, i) => toDateKey(addDays(new Date(), i))), []);
  const [date, setDate] = useState(days[0]);
  const [party, setParty] = useState(2);
  const [time, setTime] = useState('');
  const [avail, setAvail] = useState(null);
  const [availLoading, setAvailLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [busy, setBusy] = useState(false);
  const floor = useRef(null);

  const loadAvail = useCallback(async (silent = false) => {
    if (!silent) setAvailLoading(true);
    try {
      const a = await tableService.availability(restaurantId, { date, time, party });
      setAvail(a);
      if (a.open && a.time !== time) setTime(a.time);
      setSelectedId((id) => (id && a.tables?.[id] !== 'available' ? (silent && toast.info('Cette table vient d’être prise', 'Choisissez-en une autre.'), null) : id));
    } catch (e) {
      if (!silent) toast.error('Disponibilités indisponibles', e.message);
    } finally { setAvailLoading(false); }
  }, [restaurantId, date, time, party, toast]);
  useEffect(() => { loadAvail(); }, [loadAvail]);
  useLiveRefresh(() => loadAvail(true), { interval: 10000 });

  const elements = rest?.plan.elements || [];
  const byId = useMemo(() => Object.fromEntries(elements.map((e) => [e.id, e])), [elements]);
  const shownId = focusId || selectedId;
  const shown = shownId ? byId[shownId] : null;
  const shownState = shown ? (shown.id === selectedId ? 'selected' : avail?.tables?.[shown.id]) : null;
  const freeCount = avail?.tables ? Object.values(avail.tables).filter((s) => s === 'available').length : 0;

  const book = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const r = await reservationService.hold({ kind: 'restaurant', restaurantId, tableId: selectedId, date, time, party });
      nav(`/reservation/${r.id}/paiement`);
    } catch (e) {
      toast.error('Réservation impossible', e.message);
      setSelectedId(null);
      loadAvail(true);
    } finally { setBusy(false); }
  };

  if (loading && !rest) return <PageLoader label="Ouverture des portes…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-8">
      <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to={`/restaurants/${rest.id}`} className="inline-flex items-center gap-2 text-sm text-mist hover:text-paper"><ArrowLeft className="size-4" />{rest.name}</Link>
          <h1 className="display mt-2 text-4xl sm:text-5xl">Choisir <em>sa table</em></h1>
        </div>
        <Stepper steps={RESTAURANT_STEPS} current={selectedId ? 1 : 0} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="label mb-2">Date</p>
          <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Date">
            {days.map((d, i) => (
              <button key={d} type="button" role="tab" aria-selected={date === d} onClick={() => { setDate(d); setSelectedId(null); }} className="chip shrink-0 flex-col !min-h-14 !rounded-[4px] !px-3.5">
                <span className="text-[0.6875rem] uppercase">{i === 0 ? 'Auj.' : formatShortDay(d).split(' ')[0]}</span>
                <span className="font-semibold tabular">{new Date(`${d}T12:00`).getDate()}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label mb-2">Convives</p>
          <div className="flex items-center gap-1 rounded-full border border-line p-1">
            <button type="button" className="grid size-10 place-items-center rounded-full hover:bg-ink-3 disabled:opacity-40" disabled={party <= 1} onClick={() => { setParty((p) => p - 1); setSelectedId(null); }} aria-label="Une personne de moins"><Minus className="size-4" /></button>
            <span className="w-24 text-center font-semibold tabular" aria-live="polite">{party} personne{party > 1 ? 's' : ''}</span>
            <button type="button" className="grid size-10 place-items-center rounded-full hover:bg-ink-3 disabled:opacity-40" disabled={party >= 12} onClick={() => { setParty((p) => p + 1); setSelectedId(null); }} aria-label="Une personne de plus"><Plus className="size-4" /></button>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="label mb-2">Heure · {formatDay(`${date}T12:00`)}</p>
        {avail && !avail.open ? (
          <p className="rounded-[4px] border border-line p-4 text-mist">{avail.reason} Choisissez un autre jour.</p>
        ) : (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Heure">
            {(avail?.slots || []).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={time === t} className="chip tabular" aria-pressed={time === t} onClick={() => { setTime(t); setSelectedId(null); }}>{t.replace(':', ' h ')}</button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-[4px] border border-line">
            <RestaurantFloor
              ref={floor}
              plan={rest.plan}
              states={avail?.open ? avail.tables : Object.fromEntries(elements.filter((e) => e.type === 'table').map((t) => [t.id, 'disabled']))}
              selectedId={selectedId}
              onSelect={(t) => { setFocusId(null); if (avail?.tables?.[t.id] === 'available' || t.id === selectedId) setSelectedId(t.id === selectedId ? null : t.id); else { setSelectedId(null); setFocusId(t.id); } }}
              onHover={(t) => setFocusId(t?.id || null)}
            />
            {availLoading && <div className="absolute right-3 top-3 rounded-full bg-ink-2/90 p-2"><Spinner className="size-4" label="Mise à jour des disponibilités" /></div>}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Legend items={TABLE_LEGEND} />
            {avail?.open && <p className="text-sm text-mist" aria-live="polite">{freeCount} table{freeCount > 1 ? 's' : ''} libre{freeCount > 1 ? 's' : ''} pour {party} à {time.replace(':', ' h ')}</p>}
          </div>
        </div>
        <aside className="panel p-6 lg:sticky lg:top-24 lg:self-start" aria-live="polite">
          <TableInfo table={shown} state={shownState} zone={shown ? byId[shown.properties?.zoneId] : null} party={party} onBook={book} onPick={(t) => { setSelectedId(t.id); setFocusId(null); }} busy={busy} />
        </aside>
      </div>
    </div>
  );
}
