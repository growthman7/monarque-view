import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PenTool, Plus, Trash2, X } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { restaurantService } from '../../services';
import { useToast } from '../../contexts/ToastContext';
import { ErrorState, FieldGroup, Img, Modal, PageLoader, PriceRange, Spinner } from '../../components/common';
import { AdminHeader } from './AdminLayout';
import { DAYS } from '../../utils/hours';

const blank = { name: '', cuisine: '', location: '', address: '', phone: '', tagline: '', description: '', ambiance: '', priceRange: 2, duration: 120, photos: [], conditions: '', hours: [0, 1, 2, 3, 4, 5, 6].map(() => [{ open: '19:00', close: '23:00' }]), closures: [] };

function HoursEditor({ value, onChange }) {
  const setRange = (d, i, k, x) => onChange(value.map((ranges, di) => (di !== d ? ranges : ranges.map((r, ri) => (ri === i ? { ...r, [k]: x } : r)))));
  const add = (d) => onChange(value.map((ranges, di) => (di === d ? [...ranges, { open: '12:00', close: '15:00' }] : ranges)));
  const del = (d, i) => onChange(value.map((ranges, di) => (di === d ? ranges.filter((_, ri) => ri !== i) : ranges)));
  return (
    <div className="flex flex-col divide-y divide-line rounded-[4px] border border-line">
      {[1, 2, 3, 4, 5, 6, 0].map((d) => (
        <div key={d} className="flex flex-wrap items-center gap-2 px-3 py-2">
          <span className="w-24 text-sm">{DAYS[d]}</span>
          {!value[d].length && <span className="text-sm text-mist">Fermé</span>}
          {value[d].map((r, i) => (
            <span key={i} className="flex items-center gap-1">
              <input type="time" aria-label={`${DAYS[d]} ouverture`} className="field !min-h-9 !w-28 !py-1" value={r.open} onChange={(e) => setRange(d, i, 'open', e.target.value)} />
              <span className="text-mist">–</span>
              <input type="time" aria-label={`${DAYS[d]} fermeture`} className="field !min-h-9 !w-28 !py-1" value={r.close} onChange={(e) => setRange(d, i, 'close', e.target.value)} />
              <button type="button" className="p-1 text-mist hover:text-danger" onClick={() => del(d, i)} aria-label="Retirer la plage"><X className="size-4" /></button>
            </span>
          ))}
          <button type="button" className="ml-auto text-xs text-violet-hi underline" onClick={() => add(d)}>+ plage</button>
        </div>
      ))}
    </div>
  );
}

function RestaurantForm({ initial, onSave, onCancel }) {
  const [v, setV] = useState({ ...blank, ...initial, photosText: (initial?.photos || []).join('\n'), closuresText: (initial?.closures || []).map((c) => (c.to && c.to !== c.from ? `${c.from}:${c.to}` : c.from)).join('\n') });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (!v.name.trim() || !v.cuisine.trim() || !v.location.trim()) { setErr('Nom, cuisine et quartier sont obligatoires.'); return; }
    const closures = v.closuresText.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => { const [from, to] = s.split(':'); return { from, to: to || from }; });
    if (closures.some((c) => !/^\d{4}-\d{2}-\d{2}$/.test(c.from) || !/^\d{4}-\d{2}-\d{2}$/.test(c.to))) { setErr('Fermetures : une date AAAA-MM-JJ ou une période AAAA-MM-JJ:AAAA-MM-JJ par ligne.'); return; }
    setBusy(true);
    const { photosText, closuresText, plan, tableCount, seatCount, ...rest } = v;
    try { await onSave({ ...rest, priceRange: Number(v.priceRange), duration: Number(v.duration), photos: photosText.split('\n').map((s) => s.trim()).filter(Boolean), closures }); } catch (e2) { setErr(e2.message); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Nom" htmlFor="r-n"><input id="r-n" className="field" value={v.name} onChange={set('name')} /></FieldGroup>
        <FieldGroup label="Type de cuisine" htmlFor="r-c"><input id="r-c" className="field" value={v.cuisine} onChange={set('cuisine')} /></FieldGroup>
        <FieldGroup label="Quartier" htmlFor="r-l"><input id="r-l" className="field" value={v.location} onChange={set('location')} /></FieldGroup>
        <FieldGroup label="Téléphone" htmlFor="r-p"><input id="r-p" className="field" value={v.phone} onChange={set('phone')} /></FieldGroup>
        <FieldGroup label="Adresse" htmlFor="r-a"><input id="r-a" className="field" value={v.address} onChange={set('address')} /></FieldGroup>
        <FieldGroup label="Ambiance" htmlFor="r-am"><input id="r-am" className="field" value={v.ambiance} onChange={set('ambiance')} /></FieldGroup>
        <FieldGroup label="Gamme de prix (1 à 4)" htmlFor="r-pr"><input id="r-pr" type="number" min="1" max="4" className="field" value={v.priceRange} onChange={set('priceRange')} /></FieldGroup>
        <FieldGroup label="Durée d’un repas (min)" htmlFor="r-du" hint="Sert au calcul des disponibilités"><input id="r-du" type="number" min="30" step="15" className="field" value={v.duration} onChange={set('duration')} /></FieldGroup>
      </div>
      <FieldGroup label="Accroche" htmlFor="r-t"><input id="r-t" className="field" value={v.tagline} onChange={set('tagline')} /></FieldGroup>
      <FieldGroup label="Description" htmlFor="r-d"><textarea id="r-d" rows="3" className="field" value={v.description} onChange={set('description')} /></FieldGroup>
      <FieldGroup label="Conditions de réservation" htmlFor="r-co"><textarea id="r-co" rows="2" className="field" value={v.conditions} onChange={set('conditions')} /></FieldGroup>
      <FieldGroup label="Photos (une URL par ligne)" htmlFor="r-ph"><textarea id="r-ph" rows="3" className="field font-mono text-xs" value={v.photosText} onChange={set('photosText')} /></FieldGroup>
      <div><p className="mb-1.5 text-sm font-medium">Horaires d’ouverture</p><HoursEditor value={v.hours} onChange={(hours) => setV({ ...v, hours })} /></div>
      <FieldGroup label="Périodes de fermeture" htmlFor="r-cl" hint="Une date (2026-12-25) ou une période (2026-08-01:2026-08-15) par ligne"><textarea id="r-cl" rows="2" className="field font-mono text-xs" value={v.closuresText} onChange={set('closuresText')} /></FieldGroup>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <div className="flex gap-2"><button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner className="size-4" />}Enregistrer</button><button type="button" className="btn btn-ghost" onClick={onCancel}>Annuler</button></div>
    </form>
  );
}

export default function RestaurantsAdminPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => restaurantService.list(), []);
  const [editing, setEditing] = useState(null);
  const save = async (v) => {
    if (editing.id) await restaurantService.update(editing.id, v); else await restaurantService.create(v);
    toast.success('Restaurant enregistré', editing.id ? undefined : 'Dessinez maintenant son plan.');
    setEditing(null);
    reload(true);
  };
  const remove = async (r) => {
    if (!window.confirm(`Supprimer ${r.name} et son plan ?`)) return;
    try { await restaurantService.remove(r.id); toast.success('Restaurant supprimé'); reload(true); } catch (e) { toast.error('Suppression impossible', e.message); }
  };

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div>
      <AdminHeader title="Restaurants & plans" description="Informations, horaires, conditions, et plan graphique de chaque établissement.">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})}><Plus className="size-4" />Créer un restaurant</button>
      </AdminHeader>
      <ul className="divide-y divide-line border-y border-line">
        {data.map((r) => (
          <li key={r.id} className="flex flex-col gap-4 py-5 md:flex-row md:items-center">
            {r.photos[0] ? <Img src={r.photos[0].replace('w=1600', 'w=400')} alt="" className="h-24 w-36 shrink-0 rounded-[3px]" /> : <div className="h-24 w-36 shrink-0 rounded-[3px] bg-ink-3" />}
            <div className="flex-1">
              <p className="display-sm text-2xl">{r.name}</p>
              <p className="text-sm text-mist">{r.cuisine} · {r.location} · <PriceRange value={r.priceRange} /></p>
              <p className="text-sm text-mist">{r.tableCount} tables · {r.seatCount} couverts · repas {r.duration} min</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/admin/plans/${r.planId}`} className="btn btn-light btn-sm"><PenTool className="size-4" />Éditer le plan</Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(r)}>Informations</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(r)} aria-label={`Supprimer ${r.name}`}><Trash2 className="size-4" /></button>
            </div>
          </li>
        ))}
      </ul>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? editing.name : 'Nouveau restaurant'} size="max-w-3xl">
        {editing && <RestaurantForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
