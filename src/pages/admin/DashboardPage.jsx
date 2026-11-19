import { Link } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';
import { useGsap } from '../../hooks/useGsap';
import { adminService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ErrorState, PageLoader } from '../../components/common';
import { OccupancyBars, RevenueChart } from '../../components/dashboard/Charts';
import { AdminHeader } from './AdminLayout';
import { formatDateTime, formatPrice } from '../../utils/format';
import { can } from '../../utils/permissions';
import { DEMO_MODE } from '../../services/api/client';
import { gsap } from '../../animations/animationConfig';

function Kpi({ label, value, sub }) {
  return (
    <div className="border-t border-line pt-4">
      <p className="text-sm text-mist">{label}</p>
      <p className="mt-1 font-display text-[clamp(1.75rem,2.6vw,2.5rem)] leading-tight tabular">{value}</p>
      {sub && <p className="mt-1 text-xs text-mist">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => adminService.stats(), []);
  useLiveRefresh(() => reload(true), { interval: 30000 });
  const scope = useGsap(({ reduced }) => { if (!reduced && data) gsap.from('[data-kpi] > *', { y: 16, opacity: 0, stagger: 0.04, duration: 0.6 }); }, [!!data]);

  const reset = async () => {
    if (!window.confirm('Réinitialiser toutes les données de démonstration ? Les réservations de test seront effacées.')) return;
    try { await adminService.resetDemo(); toast.success('Données réinitialisées'); reload(); } catch (e) { toast.error('Erreur', e.message); }
  };

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const t = data.totals;
  return (
    <div ref={scope}>
      <AdminHeader title="Tableau de bord" description="Vue d’ensemble, mise à jour en direct.">
        {DEMO_MODE && can(user, 'demo:reset') && <button type="button" className="btn btn-ghost btn-sm" onClick={reset}><RotateCcw className="size-4" />Réinitialiser la démo</button>}
      </AdminHeader>
      <div data-kpi className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
        <Kpi label="Réservations actives" value={t.reservations} sub={`${t.today} créées aujourd’hui`} />
        <Kpi label="Cinéma" value={t.cinema} />
        <Kpi label="Restaurants" value={t.restaurant} />
        <Kpi label="Chiffre d’affaires" value={formatPrice(t.revenue)} sub="Paiements réussis" />
        <Kpi label="Transactions réussies" value={t.txSucceeded} />
        <Kpi label="En attente" value={t.txPending} />
        <Kpi label="Échouées / annulées" value={t.txFailed} />
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="panel p-6">
          <h2 className="display-sm text-2xl">Évolution sur 14 jours</h2>
          <div className="mt-6"><RevenueChart data={data.revenueByDay} /></div>
        </section>
        <section className="panel p-6">
          <h2 className="display-sm text-2xl">Dernières activités</h2>
          <ul className="mt-5 flex flex-col gap-3">
            {data.activity.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-hi" /><span className="flex-1">{a.text}<span className="block text-xs text-mist">{formatDateTime(a.at)}</span></span></li>
            ))}
          </ul>
        </section>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="panel p-6">
          <div className="flex items-center justify-between"><h2 className="display-sm text-2xl">Occupation des salles</h2><span className="text-xs text-mist">7 derniers jours</span></div>
          <div className="mt-5"><OccupancyBars items={data.hallOcc} /></div>
          {can(user, 'halls:manage') && <Link to="/admin/salles" className="mt-5 inline-block text-sm text-violet-hi underline">Gérer les salles</Link>}
        </section>
        <section className="panel p-6">
          <div className="flex items-center justify-between"><h2 className="display-sm text-2xl">Occupation des restaurants</h2><span className="text-xs text-mist">7 derniers jours</span></div>
          <div className="mt-5"><OccupancyBars items={data.restOcc} /></div>
          {can(user, 'restaurants:manage') && <Link to="/admin/restaurants" className="mt-5 inline-block text-sm text-violet-hi underline">Gérer les restaurants</Link>}
        </section>
      </div>
    </div>
  );
}
