import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, Timer } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { formatClock, useCountdown } from '../../hooks/useCountdown';
import { paymentService, reservationService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Stepper, { CINEMA_STEPS, RESTAURANT_STEPS } from '../../components/reservation/Stepper';
import GuestForm from '../../components/reservation/GuestForm';
import ReservationSummary from '../../components/reservation/ReservationSummary';
import PaymentPanel from '../../components/payment/PaymentPanel';
import { ErrorState, PageLoader, Spinner } from '../../components/common';
import { stepTransition } from '../../animations/pageTransitions';

export default function CheckoutPage() {
  const { reservationId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { data: r, error, loading, reload, setData } = useAsync(() => reservationService.get(reservationId), [reservationId]);
  const left = useCountdown(r?.status === 'pending_payment' ? r.expiresAt : null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const payRef = useRef(null);

  // Expiration : on relit l'état côté serveur (qui libère les places).
  useEffect(() => { if (r?.status === 'pending_payment' && left === 0) reload(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (r?.status === 'confirmed') nav(`/reservation/${r.id}/confirmation`, { replace: true }); }, [r?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Retour depuis la page SycaPay (production) : on vérifie la transaction côté serveur.
  useEffect(() => {
    const txId = params.get('tx');
    if (!txId) return undefined;
    let n = 0;
    const t = setInterval(async () => {
      n += 1;
      try {
        const v = await paymentService.verify(txId, reservationId);
        if (v.transaction.status !== 'pending' || n > 40) { clearInterval(t); setData({ ...v.reservation }); }
      } catch { clearInterval(t); }
    }, 3000);
    return () => clearInterval(t);
  }, [params, reservationId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !r) return <PageLoader label="Préparation de votre réservation…" />;
  if (error) return <ErrorState error={error} onRetry={reload} title="Réservation introuvable" />;

  const steps = r.kind === 'cinema' ? CINEMA_STEPS : RESTAURANT_STEPS;
  const back = r.kind === 'cinema' ? `/cinema/seances/${r.cinema.sessionId}` : `/restaurants/${r.restaurant.restaurantId}/reserver`;

  if (r.status !== 'pending_payment') {
    const msg = { expired: 'Le délai de 8 minutes est écoulé : vos places ont été libérées pour les autres clients.', cancelled: 'Cette réservation a été annulée.', refunding: 'Cette réservation est en cours de remboursement.', completed: 'Cette réservation est terminée.' }[r.status];
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-24 text-center">
        <Timer className="size-10 text-mist" />
        <h1 className="display text-5xl">{r.status === 'expired' ? 'Temps écoulé' : 'Réservation close'}</h1>
        <p className="text-mist">{msg}</p>
        <Link to={back} className="btn btn-primary">Recommencer la sélection</Link>
      </div>
    );
  }

  const saveCustomer = async (c) => {
    setBusy(true);
    try {
      const u = await reservationService.setCustomer(r.id, c);
      setData({ ...r, ...u });
      setEditing(false);
      requestAnimationFrame(() => payRef.current && stepTransition(payRef.current));
    } catch (e) { toast.error('Coordonnées non enregistrées', e.message); } finally { setBusy(false); }
  };

  const confirmFree = async () => {
    setBusy(true);
    try {
      await reservationService.confirm(r.id);
      nav(`/reservation/${r.id}/confirmation`);
    } catch (e) { toast.error('Confirmation impossible', e.message); reload(); } finally { setBusy(false); }
  };

  const release = async () => {
    setBusy(true);
    try { await reservationService.cancel(r.id); } catch { /* déjà expirée */ }
    nav(back);
  };

  const urgent = left < 90;
  const hasCustomer = !!r.customer && !editing;

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-20 pt-6 sm:px-8">
      <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="display text-4xl sm:text-5xl"><em>Finaliser</em></h1>
          <p className="mt-1 text-mist">Référence <span className="font-semibold text-paper">{r.ref}</span></p>
        </div>
        <Stepper steps={steps} current={2} />
      </div>

      <div role="timer" aria-live={urgent ? 'assertive' : 'off'} className={`mt-6 flex items-center gap-3 rounded-[4px] border p-4 text-sm transition-colors ${urgent ? 'border-warn/50 bg-warn/10 text-warn' : 'border-line bg-ink-2 text-paper/85'}`}>
        <Timer className="size-5 shrink-0" />
        <span className="flex-1">{r.kind === 'cinema' ? 'Vos sièges sont' : 'Votre table est'} bloqué{r.kind === 'cinema' ? 's' : 'e'} pour vous. Personne d’autre ne peut {r.kind === 'cinema' ? 'les' : 'la'} réserver pendant ce temps.</span>
        <span className="display-sm tabular text-2xl">{formatClock(left)}</span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="flex flex-col gap-8">
          <section className="panel p-6 sm:p-8" aria-labelledby="coord-title">
            <div className="flex items-center justify-between gap-4">
              <h2 id="coord-title" className="display-sm text-2xl">Vos coordonnées</h2>
              {hasCustomer && <button type="button" className="text-sm text-violet-hi underline" onClick={() => setEditing(true)}>Modifier</button>}
            </div>
            <div className="mt-6">
              {hasCustomer ? (
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 size-5 text-ok" />
                  <p className="text-sm"><span className="font-semibold">{r.customer.name}</span><br /><span className="text-mist">{r.customer.email} · {r.customer.phone}</span></p>
                </div>
              ) : (
                <GuestForm initial={r.customer || user} onSubmit={saveCustomer} busy={busy} user={user} returnTo={`/reservation/${r.id}/paiement`} />
              )}
            </div>
          </section>

          <section ref={payRef} className={`panel p-6 sm:p-8 ${hasCustomer ? '' : 'pointer-events-none opacity-40'}`} aria-labelledby="pay-title" aria-disabled={!hasCustomer}>
            <h2 id="pay-title" className="display-sm text-2xl">{r.paymentRequired ? 'Paiement' : 'Confirmation'}</h2>
            <div className="mt-6">
              {r.paymentRequired ? (
                <PaymentPanel reservation={hasCustomer ? r : { ...r, customer: null }} onPaid={(res) => nav(`/reservation/${res.id}/confirmation`)} />
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-mist">Aucun acompte n’est demandé pour cette table. Confirmez pour la garder à votre nom.</p>
                  <button type="button" className="btn btn-primary self-start" disabled={busy || !hasCustomer} onClick={confirmFree}>{busy && <Spinner className="size-4" />}Confirmer ma réservation</button>
                </div>
              )}
            </div>
          </section>
          <button type="button" className="self-start text-sm text-mist underline hover:text-paper" onClick={release} disabled={busy}>Annuler et libérer {r.kind === 'cinema' ? 'mes sièges' : 'la table'}</button>
        </div>
        <aside className="panel h-fit p-6 lg:sticky lg:top-24">
          <ReservationSummary r={r} />
        </aside>
      </div>
    </div>
  );
}
