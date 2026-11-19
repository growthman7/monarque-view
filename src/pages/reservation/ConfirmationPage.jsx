import { useLayoutEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarPlus, Printer } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { reservationService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import Ticket, { downloadIcs } from '../../components/reservation/Ticket';
import Stepper, { CINEMA_STEPS, RESTAURANT_STEPS } from '../../components/reservation/Stepper';
import { ErrorState, PageLoader, StatusBadge } from '../../components/common';
import { printTicket } from '../../animations/reservationAnimations';
import { gsap, prefersReducedMotion } from '../../animations/animationConfig';

export default function ConfirmationPage() {
  const { reservationId } = useParams();
  const { user } = useAuth();
  const { data: r, loading, error, reload } = useAsync(() => reservationService.get(reservationId), [reservationId]);
  const ticket = useRef(null);
  useLayoutEffect(() => {
    if (!r || !ticket.current) return undefined;
    const ctx = gsap.context(() => printTicket(ticket.current, { reduced: prefersReducedMotion() }));
    return () => ctx.revert();
  }, [r?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !r) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} title="Réservation introuvable" />;
  if (r.status === 'pending_payment') {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="display text-5xl">Pas encore confirmée</h1>
        <p className="text-mist">Cette réservation attend encore votre paiement ou vos coordonnées.</p>
        <Link to={`/reservation/${r.id}/paiement`} className="btn btn-primary">Reprendre</Link>
      </div>
    );
  }
  const confirmed = r.status === 'confirmed' || r.status === 'completed';

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-6 sm:px-8">
      <div className="flex justify-end border-b border-line pb-5 print:hidden">
        <Stepper steps={r.kind === 'cinema' ? CINEMA_STEPS : RESTAURANT_STEPS} current={3} />
      </div>
      <div className="mt-10 grid items-start gap-12 lg:grid-cols-[1fr_28rem]">
        <div className="print:hidden">
          <StatusBadge status={r.status} />
          <h1 className="display mt-4 text-[clamp(3rem,7vw,6rem)]">{confirmed ? (r.kind === 'cinema' ? 'Vos places vous attendent.' : 'Votre table est à vous.') : 'Réservation mise à jour.'}</h1>
          <p className="mt-6 max-w-lg text-lg text-paper/80">
            {confirmed ? <>Une confirmation part à <span className="font-semibold text-paper">{r.customer?.email}</span>. Présentez la référence <span className="font-semibold text-paper">{r.ref}</span> à l’accueil.</> : 'Consultez le statut ci-dessus.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" className="btn btn-light" onClick={() => window.print()}><Printer className="size-4" />Télécharger le billet (PDF)</button>
            <button type="button" className="btn btn-ghost" onClick={() => downloadIcs(r)}><CalendarPlus className="size-4" />Ajouter à l’agenda</button>
          </div>
          <div className="mt-10 rounded-[4px] border border-line p-5 text-sm text-mist">
            {user ? <>Retrouvez-la à tout moment dans <Link to="/compte" className="text-violet-hi underline">votre compte</Link>.</> : <>Sans compte, retrouvez-la avec votre référence et votre e-mail sur <Link to="/reservation/retrouver" className="text-violet-hi underline">Retrouver une réservation</Link>. Notez la référence : <span className="font-semibold text-paper">{r.ref}</span>.</>}
          </div>
          <div className="mt-8 flex gap-4 text-sm">
            <Link to="/cinema" className="text-mist underline hover:text-paper">Voir d’autres films</Link>
            <Link to="/restaurants" className="text-mist underline hover:text-paper">Réserver un dîner</Link>
          </div>
        </div>
        <Ticket ref={ticket} r={r} />
      </div>
    </div>
  );
}
