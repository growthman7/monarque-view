import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { adminService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { EmptyState, ErrorState, PageLoader, STATUS_LABELS, StatusBadge } from '../../components/common';
import { AdminHeader } from './AdminLayout';
import { formatDateTime, formatPrice } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { can } from '../../utils/permissions';

export default function TransactionsAdminPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useAsync(() => adminService.transactions({ status }), [status]);

  const report = useMemo(() => {
    const list = data || [];
    const sum = (f) => list.filter(f).reduce((s, t) => s + t.amount, 0);
    const months = {};
    list.filter((t) => t.status === 'succeeded').forEach((t) => { const k = t.createdAt.slice(0, 7); months[k] = (months[k] || 0) + t.amount; });
    return {
      cinema: sum((t) => t.status === 'succeeded' && t.kind === 'cinema'),
      restaurant: sum((t) => t.status === 'succeeded' && t.kind === 'restaurant'),
      refunded: sum((t) => t.status === 'refunded'),
      pendingRefund: sum((t) => t.status === 'refund_pending'),
      months: Object.entries(months).sort().reverse(),
    };
  }, [data]);

  const refund = async (t) => {
    const label = t.status === 'refund_pending' ? 'Valider le remboursement' : 'Rembourser';
    if (!window.confirm(`${label} ${formatPrice(t.amount)} pour ${t.ref} ?`)) return;
    try { await adminService.refund(t.id); toast.success('Remboursement enregistré'); reload(true); } catch (e) { toast.error('Remboursement impossible', e.message); }
  };

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div>
      <AdminHeader title="Finances" description="Transactions SycaPay, remboursements et rapports.">
        <button type="button" className="btn btn-ghost btn-sm" disabled={!data.length} onClick={() => downloadCsv(`transactions-${new Date().toISOString().slice(0, 10)}.csv`, data.map((t) => ({ transaction: t.id, reference: t.ref, type: t.kind, client: t.customer, montant: t.amount, devise: t.currency, statut: t.status, moyen: t.method, creee_le: t.createdAt, maj_le: t.updatedAt })))}><Download className="size-4" />Exporter (CSV)</button>
      </AdminHeader>
      <div className="mb-8 grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
        {[['Encaissé cinéma', report.cinema], ['Encaissé restaurants', report.restaurant], ['Remboursé', report.refunded], ['Remboursements à traiter', report.pendingRefund]].map(([l, v]) => (
          <div key={l} className="border-t border-line pt-4"><p className="text-sm text-mist">{l}</p><p className="mt-1 font-display text-3xl tabular">{formatPrice(v)}</p></div>
        ))}
      </div>
      {report.months.length > 0 && <p className="mb-6 text-sm text-mist">Par mois : {report.months.map(([m, v]) => `${m} ${formatPrice(v)}`).join(' · ')}</p>}
      <select className="field mb-4 max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrer par statut">
        <option value="">Tous les statuts</option>
        {['pending', 'succeeded', 'failed', 'cancelled', 'expired', 'refund_pending', 'refunded'].map((s) => <option key={s} value={s}>{STATUS_LABELS[s][0]}</option>)}
      </select>
      {!data.length ? <EmptyState title="Aucune transaction" /> : (
        <div className="overflow-x-auto rounded-[4px] border border-line">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="bg-ink-2 text-mist"><tr>{['Date', 'Réservation', 'Client', 'Moyen', 'Montant', 'Statut', ''].map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {data.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 tabular">{formatDateTime(t.createdAt)}</td>
                  <td className="px-4 font-mono">{t.ref}</td>
                  <td className="px-4">{t.customer}</td>
                  <td className="px-4">{t.method === 'demo' ? 'Simulation' : t.method}</td>
                  <td className="px-4 tabular">{formatPrice(t.amount)}</td>
                  <td className="px-4"><StatusBadge status={t.status} /></td>
                  <td className="px-4 text-right">{can(user, 'payments:refund') && ['succeeded', 'refund_pending'].includes(t.status) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => refund(t)}>{t.status === 'refund_pending' ? 'Valider' : 'Rembourser'}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
