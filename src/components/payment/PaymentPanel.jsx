import { useEffect, useRef, useState } from 'react';
import { CreditCard, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import { paymentService } from '../../services';
import { DEMO_MODE } from '../../services/api/client';
import { WANTED_METHODS } from '../../services/payment/methods';
import { DemoTag, Modal, Spinner } from '../common';
import { formatPrice } from '../../utils/format';
import { uid } from '../../utils/ids';

/**
 * Paiement SycaPay.
 * Production : le backend initialise la transaction auprès de SycaPay et renvoie l'URL/le parcours
 * de paiement ; la confirmation arrive par notification serveur, puis /payments/:id/verify.
 * Démo : un simulateur remplace la page SycaPay et joue la notification serveur.
 */
export default function PaymentPanel({ reservation, onPaid, onError }) {
  const [methods, setMethods] = useState(null);
  const [method, setMethod] = useState(DEMO_MODE ? 'demo' : '');
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState(null);
  const [message, setMessage] = useState(null);
  const key = useRef(uid('idem'));

  useEffect(() => { paymentService.methods().then(setMethods).catch(() => setMethods({ verified: [] })); }, []);
  const verified = new Set(methods?.verified || []);

  const pay = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const t = await paymentService.init({ reservationId: reservation.id, method, idempotencyKey: key.current });
      setTx(t);
      if (t.checkoutUrl) { window.location.assign(t.checkoutUrl); return; }
    } catch (e) {
      setMessage(e.message);
      onError?.(e);
    } finally { setBusy(false); }
  };

  const verify = async (t) => {
    const r = await paymentService.verify(t.id, reservation.id);
    const status = r.transaction.status;
    if (status === 'succeeded' && r.reservation.status === 'confirmed') { setTx(null); onPaid(r.reservation); return; }
    if (status === 'pending') return;
    setTx(null);
    key.current = uid('idem'); // nouvelle tentative = nouvelle clé d'idempotence
    setMessage({ failed: 'Le paiement a été refusé. Aucun montant n’a été débité. Vous pouvez réessayer ou changer de moyen de paiement.', cancelled: 'Paiement annulé. Votre sélection reste bloquée jusqu’à la fin du compte à rebours.', expired: 'La transaction a expiré.', refund_pending: 'Le paiement est arrivé après l’expiration de votre sélection : il sera remboursé automatiquement.' }[status] || `Statut : ${status}`);
  };

  const simulate = async (outcome) => {
    setBusy(true);
    try {
      await paymentService.demoOutcome(tx.id, outcome);
      await verify(tx);
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  };

  const Option = ({ id, label, icon: Icon, enabled, note }) => (
    <label className={`flex items-center gap-3 rounded-[4px] border p-4 transition-colors ${!enabled ? 'cursor-not-allowed border-line opacity-50' : method === id ? 'border-violet-hi bg-violet/10' : 'cursor-pointer border-line hover:border-mist'}`}>
      <input type="radio" name="method" value={id} checked={method === id} disabled={!enabled} onChange={() => setMethod(id)} className="size-4 accent-[#A855F7]" />
      <Icon className="size-5 text-violet-hi" aria-hidden />
      <span className="flex-1"><span className="block font-semibold">{label}</span>{note && <span className="block text-xs text-mist">{note}</span>}</span>
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      {!methods ? <Spinner /> : (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Moyen de paiement</legend>
          {DEMO_MODE && <Option id="demo" label="Paiement simulé" icon={ShieldCheck} enabled note="Mode démonstration : aucun débit, vous choisissez le résultat." />}
          {WANTED_METHODS.map((m) => (
            <Option key={m.id} id={m.id} label={m.label} icon={m.group === 'card' ? CreditCard : Smartphone} enabled={verified.has(m.id)} note={verified.has(m.id) ? null : 'Disponibilité à confirmer avec SycaPay'} />
          ))}
        </fieldset>
      )}
      {message && <p role="alert" className="rounded-[3px] border border-danger/40 bg-danger/10 p-3 text-sm text-paper">{message}</p>}
      <button type="button" className="btn btn-primary w-full" disabled={busy || !method || !reservation.customer} onClick={pay}>
        {busy ? <Spinner className="size-4" /> : <Lock className="size-4" />}Payer {formatPrice(reservation.amount)}
      </button>
      {!reservation.customer && <p className="text-xs text-mist">Validez d’abord vos coordonnées.</p>}
      <p className="flex items-center gap-2 text-xs text-mist"><ShieldCheck className="size-4" />Paiement traité par SycaPay. MONARQUE ne voit ni ne stocke vos données de carte ou de compte mobile.</p>

      <Modal open={!!tx && !tx.checkoutUrl} onClose={() => !busy && simulate('cancel')} title="Passerelle SycaPay — simulateur">
        <div className="flex flex-col gap-4">
          <DemoTag className="self-start">Simulation</DemoTag>
          <p className="text-mist">En production, vous seriez ici sur la page de paiement SycaPay (Mobile Money ou carte). Choisissez l’issue à simuler : le serveur de démonstration reçoit alors la notification, comme le ferait le vrai backend.</p>
          <div className="rounded-[4px] bg-ink-3 p-4 text-sm">
            <p className="flex justify-between"><span className="text-mist">Référence</span><span className="font-semibold">{reservation.ref}</span></p>
            <p className="mt-1 flex justify-between"><span className="text-mist">Montant</span><span className="font-semibold tabular">{formatPrice(reservation.amount)}</span></p>
            <p className="mt-1 flex justify-between"><span className="text-mist">Transaction</span><span className="font-mono text-xs">{tx?.id}</span></p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => simulate('success')}>Réussi</button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => simulate('failure')}>Refusé</button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => simulate('cancel')}>Abandonné</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
