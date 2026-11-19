import { useState } from 'react';
import { Link } from 'react-router-dom';
import { reservationService } from '../../services';
import { FieldGroup, Spinner, StatusBadge } from '../../components/common';
import ReservationSummary from '../../components/reservation/ReservationSummary';
import { useToast } from '../../contexts/ToastContext';
import { isEmail } from '../../utils/validation';

export default function FindReservationPage() {
  const toast = useToast();
  const [ref, setRef] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [r, setR] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^MQ-[A-Z0-9]{6}$/i.test(ref.trim())) { setErr('La référence ressemble à MQ-7K3X9P.'); return; }
    if (!isEmail(email)) { setErr('Adresse e-mail invalide.'); return; }
    setErr(null);
    setBusy(true);
    try { setR(await reservationService.lookup(ref, email)); } catch (e2) { setErr(e2.message); setR(null); } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!window.confirm('Annuler cette réservation ? Si elle a été payée, le remboursement sera lancé.')) return;
    setBusy(true);
    try {
      const u = await reservationService.cancel(r.id);
      setR({ ...r, ...u, cancellation: { allowed: false } });
      toast.success('Réservation annulée', u.status === 'refunding' ? 'Le remboursement est en cours.' : 'Votre place a été libérée.');
    } catch (e) { toast.error('Annulation impossible', e.message); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto grid max-w-[1200px] gap-12 px-4 pb-24 pt-32 sm:px-8 lg:grid-cols-2">
      <div>
        <h1 className="display text-[clamp(3rem,7vw,6rem)]">Retrouver <em>une réservation</em></h1>
        <p className="mt-4 max-w-md text-mist">Réservé sans compte ? Saisissez la référence reçue (MQ-…) et l’adresse e-mail utilisée.</p>
        <form onSubmit={submit} noValidate className="mt-10 flex max-w-md flex-col gap-5">
          <FieldGroup label="Référence" htmlFor="f-ref"><input id="f-ref" className="field font-mono uppercase tracking-widest" placeholder="MQ-7K3X9P" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} /></FieldGroup>
          <FieldGroup label="Adresse e-mail" htmlFor="f-email"><input id="f-email" type="email" className="field" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></FieldGroup>
          {err && <p role="alert" className="text-sm text-danger">{err}</p>}
          <button type="submit" className="btn btn-primary self-start" disabled={busy}>{busy && <Spinner className="size-4" />}Rechercher</button>
        </form>
      </div>
      <div>
        {r ? (
          <div className="panel p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between"><p className="font-mono font-bold tracking-widest">{r.ref}</p><StatusBadge status={r.status} /></div>
            <ReservationSummary r={r} />
            <div className="mt-6 flex flex-wrap gap-3">
              {(r.status === 'confirmed' || r.status === 'completed') && <Link to={`/reservation/${r.id}/confirmation`} className="btn btn-light">Voir le billet</Link>}
              {r.status === 'pending_payment' && <Link to={`/reservation/${r.id}/paiement`} className="btn btn-primary">Reprendre le paiement</Link>}
              {r.status === 'confirmed' && (r.cancellation?.allowed
                ? <button type="button" className="btn btn-ghost" onClick={cancel} disabled={busy}>Annuler</button>
                : <p className="text-xs text-mist">Annulation en ligne fermée ({r.kind === 'cinema' ? '2' : '3'} h avant). Contactez l’établissement.</p>)}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-60 items-center justify-center rounded-[4px] border border-dashed border-line p-8 text-center text-mist">Le détail de la réservation s’affichera ici.</div>
        )}
      </div>
    </div>
  );
}
