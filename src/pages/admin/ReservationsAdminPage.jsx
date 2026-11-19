import { useEffect, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';
import { adminService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { EmptyState, ErrorState, Modal, PageLoader, STATUS_LABELS, StatusBadge } from '../../components/common';
import ReservationSummary from '../../components/reservation/ReservationSummary';
import { AdminHeader } from './AdminLayout';
import { formatDateTime, formatPrice } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { can } from '../../utils/permissions';

const ACTIONS = {
  pending_payment: [['cancelled', 'Annuler']],
  confirmed: [['completed', 'Marquer terminée'], ['refunding', 'Annuler et rembourser'], ['cancelled', 'Annuler sans remboursement']],
  refunding: [['cancelled', 'Clore (remboursé)']],
};

export default function ReservationsAdminPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(null);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(t); }, [q]);
  const { data, loading, error, reload } = useAsync(() => adminService.reservations({ q: debounced, kind, status }), [debounced, kind, status]);
  useLiveRefresh(() => reload(true), { interval: 20000 });

  const setStatusFor = async (r, s) => {
    try {
      const u = await adminService.setStatus(r.id, s);
      toast.success('Statut mis à jour', STATUS_LABELS[u.status]?.[0]);
      setOpen({ ...open, ...u });
      reload(true);
    } catch (e) { toast.error('Action refusée', e.message); }
  };
  const exportCsv = () => downloadCsv(`reservations-${new Date().toISOString().slice(0, 10)}.csv`, data.items.map((r) => ({
    reference: r.ref, type: r.kind, statut: r.status, client: r.customer?.name, email: r.customer?.email, telephone: r.customer?.phone,
    etablissement: r.summary?.title, date: r.summary?.startsAt, places: r.kind === 'cinema' ? r.cinema.seatLabels.join(' ') : `Table ${r.restaurant.tableLabel} (${r.restaurant.party} pers.)`,
    montant: r.amount, creee_le: r.createdAt,
  })));

  return (
    <div>
      <AdminHeader title="Réservations" description={data ? `${data.total} réservation(s)` : ''}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!data?.items.length}><Download className="size-4" />Exporter (CSV)</button>
      </AdminHeader>
      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_12rem_14rem]">
        <label className="relative"><span className="sr-only">Rechercher</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mist" /><input className="field !pl-9" placeholder="Référence, nom ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <select className="field" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type"><option value="">Tous les types</option><option value="cinema">Cinéma</option><option value="restaurant">Restaurant</option></select>
        <select className="field" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Statut"><option value="">Tous les statuts</option>{['pending_payment', 'confirmed', 'completed', 'cancelled', 'expired', 'refunding'].map((s) => <option key={s} value={s}>{STATUS_LABELS[s][0]}</option>)}</select>
      </div>
      {loading && !data ? <PageLoader /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.items.length ? <EmptyState title="Aucune réservation" /> : (
        <div className="overflow-x-auto rounded-[4px] border border-line">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="bg-ink-2 text-mist"><tr>{['Référence', 'Client', 'Établissement', 'Date', 'Places', 'Montant', 'Statut'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {data.items.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-ink-2" onClick={() => setOpen(r)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(r)}>
                  <td className="px-4 py-3 font-mono font-semibold">{r.ref}</td>
                  <td className="px-4">{r.customer?.name || <span className="text-mist">—</span>}</td>
                  <td className="px-4">{r.summary?.title}</td>
                  <td className="px-4 tabular">{r.summary?.startsAt && formatDateTime(r.summary.startsAt)}</td>
                  <td className="px-4">{r.kind === 'cinema' ? r.cinema.seatLabels.join(', ') : `${r.restaurant.tableLabel} · ${r.restaurant.party} p.`}</td>
                  <td className="px-4 tabular">{formatPrice(r.amount)}</td>
                  <td className="px-4"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.ref}>
        {open && (
          <div className="flex flex-col gap-6">
            <ReservationSummary r={open} showStatus />
            <div className="text-sm">
              <p className="font-semibold">Client</p>
              <p className="text-mist">{open.customer ? `${open.customer.name} · ${open.customer.email} · ${open.customer.phone}` : 'Coordonnées non renseignées'}</p>
            </div>
            <div className="text-sm">
              <p className="font-semibold">Historique</p>
              <ul className="mt-1 space-y-1 text-mist">{open.history.map((h, i) => <li key={i}>{formatDateTime(h.at)} · {STATUS_LABELS[h.status]?.[0] || h.status} · {h.by}</li>)}</ul>
            </div>
            {can(user, 'reservations:manage') && ACTIONS[open.status] && (
              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                {ACTIONS[open.status].map(([s, l]) => <button key={s} type="button" className={s === 'cancelled' || s === 'refunding' ? 'btn btn-ghost btn-sm' : 'btn btn-light btn-sm'} onClick={() => setStatusFor(open, s)}>{l}</button>)}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
