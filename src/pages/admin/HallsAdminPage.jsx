import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PenTool, Plus } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { hallService, planService } from '../../services';
import { useToast } from '../../contexts/ToastContext';
import { ErrorState, FieldGroup, Modal, PageLoader, Spinner } from '../../components/common';
import SeatMap from '../../components/floor-plan/SeatMap';
import { AdminHeader } from './AdminLayout';
import { formatPrice } from '../../utils/format';

function HallPreview({ planId }) {
  const { data } = useAsync(() => planService.getPublished(planId), [planId]);
  if (!data) return <div className="h-48 animate-pulse rounded-[4px] bg-ink-3" />;
  if (!data.elements.length) return <div className="grid h-48 place-items-center rounded-[4px] border border-dashed border-line text-sm text-mist">Plan vide : ouvrez l’éditeur</div>;
  return <div className="pointer-events-none overflow-hidden rounded-[4px] bg-ink-3"><SeatMap plan={data} occupied={new Set()} locked={new Set()} selected={new Set()} onToggle={() => {}} interactive={false} height="12rem" /></div>;
}

export default function HallsAdminPage() {
  const toast = useToast();
  const nav = useNavigate();
  const { data, loading, error, reload } = useAsync(() => hallService.list(), []);
  const [creating, setCreating] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [v, setV] = useState({ name: '', width: 1000, height: 700 });
  const [busy, setBusy] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    if (!v.name.trim()) return;
    setBusy(true);
    try { const h = await hallService.create(v); toast.success('Salle créée', 'Dessinez maintenant son plan.'); nav(`/admin/plans/${h.planId}`); } catch (e2) { toast.error('Erreur', e2.message); } finally { setBusy(false); }
  };
  const savePrices = async (e) => {
    e.preventDefault();
    try { await hallService.update(pricing.id, { prices: Object.fromEntries(Object.entries(pricing.prices).map(([k, x]) => [k, Number(x)])) }); toast.success('Tarifs enregistrés', 'Ils s’appliquent aux nouvelles séances.'); setPricing(null); reload(true); } catch (e2) { toast.error('Erreur', e2.message); }
  };

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div>
      <AdminHeader title="Salles & plans" description="Chaque salle possède un plan dessiné dans l’éditeur, versionné et publié.">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}><Plus className="size-4" />Créer une salle</button>
      </AdminHeader>
      <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
        {data.map((h) => (
          <article key={h.id} className="panel flex flex-col gap-4 p-5">
            <HallPreview planId={h.planId} />
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="display-sm text-2xl">{h.name}</h2><p className="text-sm text-mist">{h.seats} sièges · plan v{h.publishedVersion || 0}</p></div>
            </div>
            <p className="text-xs text-mist">{Object.entries(h.prices).map(([k, x]) => `${k} ${formatPrice(x)}`).join(' · ')}</p>
            <div className="mt-auto flex flex-wrap gap-2">
              <Link to={`/admin/plans/${h.planId}`} className="btn btn-light btn-sm"><PenTool className="size-4" />Éditer le plan</Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPricing({ ...h })}>Catégories & tarifs</button>
            </div>
          </article>
        ))}
      </div>
      <Modal open={creating} onClose={() => setCreating(false)} title="Nouvelle salle">
        <form onSubmit={create} className="flex flex-col gap-4">
          <FieldGroup label="Nom" htmlFor="h-n"><input id="h-n" className="field" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Largeur de la scène" htmlFor="h-w" hint="Unités de plan"><input id="h-w" type="number" min="400" className="field" value={v.width} onChange={(e) => setV({ ...v, width: Number(e.target.value) })} /></FieldGroup>
            <FieldGroup label="Profondeur" htmlFor="h-h"><input id="h-h" type="number" min="300" className="field" value={v.height} onChange={(e) => setV({ ...v, height: Number(e.target.value) })} /></FieldGroup>
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner className="size-4" />}Créer et ouvrir l’éditeur</button>
        </form>
      </Modal>
      <Modal open={!!pricing} onClose={() => setPricing(null)} title={`Tarifs · ${pricing?.name || ''}`}>
        {pricing && (
          <form onSubmit={savePrices} className="flex flex-col gap-4">
            {Object.keys(pricing.prices).map((k) => (
              <FieldGroup key={k} label={`${k[0].toUpperCase()}${k.slice(1)} (FCFA)`} htmlFor={`p-${k}`}><input id={`p-${k}`} type="number" min="0" step="500" className="field" value={pricing.prices[k]} onChange={(e) => setPricing({ ...pricing, prices: { ...pricing.prices, [k]: e.target.value } })} /></FieldGroup>
            ))}
            <p className="text-xs text-mist">La catégorie de chaque siège se règle dans l’éditeur de plan.</p>
            <button type="submit" className="btn btn-primary">Enregistrer</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
