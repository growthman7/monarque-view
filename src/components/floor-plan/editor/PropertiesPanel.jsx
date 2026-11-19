import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, Copy, StretchHorizontal, StretchVertical, Trash2 } from 'lucide-react';
import { SEAT_CATEGORIES, ZONE_COLORS } from '../../../utils/planGenerators';

const TYPE_LABEL = { seat: 'Siège', table: 'Table', zone: 'Zone', wall: 'Mur / séparation', door: 'Porte', decor: 'Décor', label: 'Repère', screen: 'Écran' };

function Num({ label, value, onChange, step = 1, min }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-mist">
      {label}
      <input type="number" step={step} min={min} className="field !min-h-9 !rounded-lg !px-2 !py-1 text-sm tabular" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
    </label>
  );
}
function Txt({ label, value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-mist">
      {label}
      <input className="field !min-h-9 !rounded-lg !px-2 !py-1 text-sm" value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function Sel({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-mist">
      {label}
      <select className="field !min-h-9 !rounded-lg !px-2 !py-1 text-sm" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export default function PropertiesPanel({ elements, selection, update, updateMany, onAlign, onDistribute, onDuplicate, onDelete }) {
  const sel = elements.filter((e) => selection.includes(e.id));
  if (!sel.length) {
    return (
      <div className="space-y-3 p-4 text-sm text-mist">
        <p className="font-semibold text-paper">Aucune sélection</p>
        <p>Cliquez un élément pour l’éditer. Maj + clic ou un cadre tracé à la souris pour en sélectionner plusieurs.</p>
        <ul className="space-y-1 text-xs">
          <li><kbd className="rounded bg-ink-3 px-1">Espace</kbd> + glisser : déplacer la vue</li>
          <li><kbd className="rounded bg-ink-3 px-1">Molette</kbd> : zoom</li>
          <li><kbd className="rounded bg-ink-3 px-1">Ctrl Z</kbd> / <kbd className="rounded bg-ink-3 px-1">Ctrl Y</kbd> : annuler / rétablir</li>
          <li><kbd className="rounded bg-ink-3 px-1">Ctrl D</kbd> : dupliquer · <kbd className="rounded bg-ink-3 px-1">Suppr</kbd> : supprimer</li>
          <li><kbd className="rounded bg-ink-3 px-1">Flèches</kbd> : déplacer (Maj = ×10)</li>
        </ul>
      </div>
    );
  }

  const actions = (
    <div className="flex gap-2">
      <button type="button" className="btn btn-ghost btn-sm flex-1" onClick={onDuplicate}><Copy className="size-3.5" />Dupliquer</button>
      <button type="button" className="btn btn-ghost btn-sm flex-1 hover:!border-danger hover:!text-danger" onClick={onDelete}><Trash2 className="size-3.5" />Supprimer</button>
    </div>
  );

  if (sel.length > 1) {
    const allSeats = sel.every((e) => e.type === 'seat');
    const ib = 'grid size-9 place-items-center rounded-lg border border-line hover:border-violet-hi hover:text-violet-hi';
    return (
      <div className="space-y-5 p-4">
        <p className="font-semibold">{sel.length} éléments sélectionnés</p>
        <div>
          <p className="mb-2 text-xs text-mist">Aligner</p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={ib} title="Aligner à gauche" onClick={() => onAlign('left')}><AlignStartVertical className="size-4" /></button>
            <button type="button" className={ib} title="Centrer horizontalement" onClick={() => onAlign('hcenter')}><AlignCenterVertical className="size-4" /></button>
            <button type="button" className={ib} title="Aligner à droite" onClick={() => onAlign('right')}><AlignEndVertical className="size-4" /></button>
            <button type="button" className={ib} title="Aligner en haut" onClick={() => onAlign('top')}><AlignStartHorizontal className="size-4" /></button>
            <button type="button" className={ib} title="Centrer verticalement" onClick={() => onAlign('vcenter')}><AlignCenterHorizontal className="size-4" /></button>
            <button type="button" className={ib} title="Aligner en bas" onClick={() => onAlign('bottom')}><AlignEndHorizontal className="size-4" /></button>
          </div>
          <p className="mb-2 mt-4 text-xs text-mist">Répartir (3 éléments ou plus)</p>
          <div className="flex gap-1.5">
            <button type="button" className={ib} title="Répartir horizontalement" disabled={sel.length < 3} onClick={() => onDistribute('h')}><StretchHorizontal className="size-4" /></button>
            <button type="button" className={ib} title="Répartir verticalement" disabled={sel.length < 3} onClick={() => onDistribute('v')}><StretchVertical className="size-4" /></button>
          </div>
        </div>
        {allSeats && (
          <div className="grid grid-cols-2 gap-2">
            <Sel label="Catégorie" value="" onChange={(v) => v && updateMany({ category: v })} options={[['', '—'], ...Object.entries(SEAT_CATEGORIES).map(([k, c]) => [k, c.label])]} />
            <Sel label="État" value="" onChange={(v) => v && updateMany({ status: v })} options={[['', '—'], ['active', 'Réservable'], ['disabled', 'Indisponible']]} />
          </div>
        )}
        {actions}
      </div>
    );
  }

  const e = sel[0];
  const set = (patch) => update(e.id, patch);
  const setP = (patch) => update(e.id, { properties: { ...e.properties, ...patch } });
  return (
    <div className="space-y-4 p-4">
      <p className="font-semibold">{TYPE_LABEL[e.type] || e.type}</p>
      {e.type !== 'wall' && e.type !== 'decor' && <Txt label={e.type === 'zone' ? 'Nom de la zone' : 'Identifiant / libellé'} value={e.label} onChange={(v) => set({ label: v })} />}
      {e.type === 'decor' && e.properties?.kind !== 'plant' && <Txt label="Libellé" value={e.label} onChange={(v) => set({ label: v })} />}
      <div className="grid grid-cols-2 gap-2">
        <Num label="X" value={e.x} onChange={(v) => set({ x: Number(v) || 0 })} />
        <Num label="Y" value={e.y} onChange={(v) => set({ y: Number(v) || 0 })} />
        <Num label="Largeur" value={e.width} min={4} onChange={(v) => set({ width: Math.max(4, Number(v) || 4) })} />
        <Num label="Hauteur" value={e.height} min={4} onChange={(v) => set({ height: Math.max(4, Number(v) || 4) })} />
        <Num label="Rotation (°)" value={e.rotation} step={15} onChange={(v) => set({ rotation: ((Number(v) || 0) % 360 + 360) % 360 })} />
        {(e.type === 'seat' || e.type === 'table') && <Sel label="État" value={e.status} onChange={(v) => set({ status: v })} options={[['active', 'Réservable'], ['disabled', 'Indisponible']]} />}
      </div>

      {e.type === 'seat' && (
        <div className="grid grid-cols-2 gap-2">
          <Txt label="Rang" value={e.properties?.row} onChange={(v) => update(e.id, { properties: { ...e.properties, row: v.toUpperCase() }, label: `${v.toUpperCase()}${e.properties?.number ?? ''}` })} />
          <Num label="Numéro" value={e.properties?.number} onChange={(v) => update(e.id, { properties: { ...e.properties, number: v }, label: `${e.properties?.row ?? ''}${v}` })} />
          <Sel label="Catégorie" value={e.category} onChange={(v) => set({ category: v })} options={Object.entries(SEAT_CATEGORIES).map(([k, c]) => [k, c.label])} />
          <label className="flex items-end gap-2 pb-2 text-xs text-mist"><input type="checkbox" className="size-4 accent-[#A855F7]" checked={!!e.properties?.accessible} onChange={(ev) => setP({ accessible: ev.target.checked })} />PMR</label>
        </div>
      )}

      {e.type === 'table' && (
        <div className="grid grid-cols-2 gap-2">
          <Sel label="Forme" value={e.properties?.shape} onChange={(v) => setP({ shape: v })} options={[['round', 'Ronde'], ['square', 'Carrée'], ['rect', 'Rectangulaire']]} />
          <Num label="Capacité" value={e.capacity} min={1} onChange={(v) => set({ capacity: Math.max(1, Number(v) || 1) })} />
          <Num label="Convives min." value={e.properties?.minParty} min={1} onChange={(v) => setP({ minParty: Math.max(1, Number(v) || 1) })} />
          <Num label="Acompte (FCFA)" value={e.properties?.deposit} step={1000} min={0} onChange={(v) => setP({ deposit: Math.max(0, Number(v) || 0) })} />
          <Sel label="Catégorie" value={e.category} onChange={(v) => set({ category: v })} options={[['standard', 'Standard'], ['vip', 'VIP'], ['private', 'Privée']]} />
          <div className="col-span-2"><Txt label="Particularités (virgules)" value={(e.properties?.features || []).join(', ')} onChange={(v) => setP({ features: v.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="Vue lagune, banquette…" /></div>
        </div>
      )}

      {e.type === 'zone' && (
        <div className="space-y-2">
          <p className="text-xs text-mist">Couleur</p>
          <div className="flex gap-2">{ZONE_COLORS.map((c) => <button key={c} type="button" aria-label={`Couleur ${c}`} className={`size-7 rounded-full border-2 ${e.properties?.color === c ? 'border-paper' : 'border-transparent'}`} style={{ background: c }} onClick={() => setP({ color: c })} />)}</div>
          <label className="flex items-center gap-2 text-xs text-mist"><input type="checkbox" className="size-4 accent-[#A855F7]" checked={!!e.properties?.outdoor} onChange={(ev) => setP({ outdoor: ev.target.checked })} />Extérieur</label>
        </div>
      )}

      {e.type === 'screen' && <Num label="Courbure de l’écran" value={e.properties?.curve} onChange={(v) => setP({ curve: Number(v) || 0 })} />}
      {actions}
    </div>
  );
}
