import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { paymentService, reservationService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { EmptyState, ErrorState, FieldGroup, PageLoader, Spinner, StatusBadge } from '../../components/common';
import { formatDateTime, formatDay, formatPrice, formatTime } from '../../utils/format';
import { ROLES, isStaff } from '../../utils/permissions';
import { isPhone } from '../../utils/validation';

export default function AccountPage() {
  const { user, logout, updateProfile } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('upcoming');
  const { data, loading, error, reload } = useAsync(async () => {
    const [res, tx] = await Promise.all([reservationService.mine(), paymentService.mine()]);
    return { res, tx };
  }, []);
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone || '' });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (profile.name.trim().length < 2) return toast.error('Nom trop court');
    if (profile.phone && !isPhone(profile.phone)) return toast.error('Téléphone invalide');
    setSaving(true);
    try { await updateProfile(profile); toast.success('Profil mis à jour'); } catch (e2) { toast.error('Erreur', e2.message); } finally { setSaving(false); }
    return null;
  };
  const cancel = async (r) => {
    if (!window.confirm(`Annuler la réservation ${r.ref} ?`)) return;
    try {
      const u = await reservationService.cancel(r.id);
      toast.success('Réservation annulée', u.status === 'refunding' ? 'Le remboursement est en cours.' : undefined);
      reload(true);
    } catch (e) { toast.error('Annulation impossible', e.message); }
  };

  const now = Date.now();
  const all = data?.res || [];
  const upcoming = all.filter((r) => ['confirmed', 'pending_payment', 'refunding'].includes(r.status) && new Date(r.summary.startsAt).getTime() > now - 3 * 3600e3);
  const past = all.filter((r) => !upcoming.includes(r));
  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-32 sm:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="label">{ROLES[user.role]}</p>
          <h1 className="display mt-2 text-6xl sm:text-7xl">Bonjour {user.name.split(' ')[0]}</h1>
        </div>
        <div className="flex gap-2">
          {isStaff(user) && <Link to="/admin" className="btn btn-ghost">Administration</Link>}
          <button type="button" className="btn btn-ghost" onClick={async () => { await logout(); nav('/'); }}><LogOut className="size-4" />Déconnexion</button>
        </div>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="res-title">
          <div className="flex items-center justify-between gap-4">
            <h2 id="res-title" className="display-sm text-3xl">Mes réservations</h2>
            <div role="tablist" className="flex gap-2">
              <button type="button" role="tab" aria-selected={tab === 'upcoming'} className="chip" onClick={() => setTab('upcoming')}>À venir ({upcoming.length})</button>
              <button type="button" role="tab" aria-selected={tab === 'past'} className="chip" onClick={() => setTab('past')}>Historique ({past.length})</button>
            </div>
          </div>
          <div className="mt-6">
            {loading && !data ? <PageLoader /> : error ? <ErrorState error={error} onRetry={reload} /> : !list.length ? (
              <EmptyState title={tab === 'upcoming' ? 'Rien de prévu pour l’instant' : 'Pas encore d’historique'} action={<div className="flex gap-2"><Link to="/cinema" className="btn btn-primary">Voir les films</Link><Link to="/restaurants" className="btn btn-ghost">Les restaurants</Link></div>} />
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {list.map((r) => (
                  <li key={r.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3"><p className="display-sm text-xl">{r.summary.title}</p><StatusBadge status={r.status} /></div>
                      <p className="mt-1 text-sm text-mist">{formatDay(r.summary.startsAt)} · {formatTime(r.summary.startsAt)} · {r.kind === 'cinema' ? `Sièges ${r.cinema.seatLabels.join(', ')}` : `Table ${r.restaurant.tableLabel}, ${r.restaurant.party} pers.`}</p>
                      <p className="text-xs text-mist">Réf. {r.ref} · {formatPrice(r.amount)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['confirmed', 'completed'].includes(r.status) && <Link to={`/reservation/${r.id}/confirmation`} className="btn btn-ghost btn-sm">Billet</Link>}
                      {r.status === 'pending_payment' && <Link to={`/reservation/${r.id}/paiement`} className="btn btn-primary btn-sm">Finaliser</Link>}
                      {r.status === 'confirmed' && r.cancellation?.allowed && <button type="button" className="btn btn-ghost btn-sm" onClick={() => cancel(r)}>Annuler</button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h2 className="display-sm mt-16 text-3xl">Mes paiements</h2>
          {data?.tx?.length ? (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-mist"><tr><th className="py-2 font-medium">Date</th><th className="font-medium">Réservation</th><th className="font-medium">Montant</th><th className="font-medium">Statut</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {data.tx.map((t) => <tr key={t.id}><td className="py-3 tabular">{formatDateTime(t.createdAt)}</td><td>{t.ref}</td><td className="tabular">{formatPrice(t.amount)}</td><td><StatusBadge status={t.status} /></td></tr>)}
                </tbody>
              </table>
            </div>
          ) : <p className="mt-4 text-mist">Aucun paiement pour l’instant.</p>}
        </section>

        <aside>
          <form onSubmit={save} className="panel flex flex-col gap-4 p-6">
            <h2 className="display-sm text-2xl">Profil</h2>
            <FieldGroup label="Nom complet" htmlFor="p-name"><input id="p-name" className="field" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></FieldGroup>
            <FieldGroup label="Téléphone" htmlFor="p-phone"><input id="p-phone" type="tel" className="field" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></FieldGroup>
            <FieldGroup label="E-mail" htmlFor="p-email" hint="Contactez le support pour changer d’adresse."><input id="p-email" className="field opacity-60" value={user.email} readOnly /></FieldGroup>
            <button type="submit" className="btn btn-light" disabled={saving}>{saving && <Spinner className="size-4" />}Enregistrer</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
