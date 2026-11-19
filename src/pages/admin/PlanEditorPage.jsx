import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Armchair, Circle, DoorOpen, Eye, Flower2, Hand, History, Maximize2, Minus, MousePointer2, Plus, Redo2, Rows3, Save, Send, Square, RectangleHorizontal, Tag, Undo2, LayoutGrid, Martini, Monitor, ListOrdered, BrickWall } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { hallService, planService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ErrorState, FieldGroup, Modal, PageLoader, Spinner } from '../../components/common';
import EditorCanvas from '../../components/floor-plan/editor/EditorCanvas';
import PropertiesPanel from '../../components/floor-plan/editor/PropertiesPanel';
import { addRow, align, createElement, distribute, duplicate, nextLabel, nextRowLetter, renumberSeats } from '../../components/floor-plan/editor/editorOps';
import SeatMap from '../../components/floor-plan/SeatMap';
import RestaurantFloor from '../../components/floor-plan/RestaurantFloor';
import { SEAT_CATEGORIES, assignZones, validatePlan } from '../../utils/planGenerators';
import { formatDateTime } from '../../utils/format';
import { can, canEditPlanKind } from '../../utils/permissions';

const HISTORY_MAX = 100;
const snapshotOf = (p) => ({ elements: p.elements, width: p.width, height: p.height });

export default function PlanEditorPage() {
  const { planId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data: loaded, loading, error, reload } = useAsync(() => planService.getDraft(planId), [planId]);
  // Plan + historique dans un seul état : annuler/rétablir restent atomiques.
  const [st, setSt] = useState(null);
  const plan = st?.plan;
  const hist = st || { past: [], future: [] };
  const setPlan = (p) => setSt((s) => ({ ...s, plan: typeof p === 'function' ? p(s.plan) : p }));
  const [selection, setSelection] = useState([]);
  const [tool, setTool] = useState('select');
  const [snap, setSnap] = useState(true);
  const [camera, setCamera] = useState({ scale: 1, x: 0, y: 0 });
  const [stageSize, setStageSize] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState('props');
  const [rowDialog, setRowDialog] = useState(null);
  const [preview, setPreview] = useState(false);
  const [issues, setIssues] = useState(null);
  const [hall, setHall] = useState(null);
  const coalesce = useRef({ key: null, at: 0 });

  useEffect(() => {
    if (!loaded) return;
    setSt({ plan: { name: loaded.name, width: loaded.width, height: loaded.height, gridSize: loaded.gridSize || 10, elements: loaded.elements, kind: loaded.kind, ownerId: loaded.ownerId, versions: loaded.versions, publishedVersion: loaded.publishedVersion, updatedAt: loaded.updatedAt }, past: [], future: [] });
    setDirty(false);
    if (loaded.kind === 'cinema') hallService.list().then((hs) => setHall(hs.find((h) => h.id === loaded.ownerId) || null)).catch(() => {});
  }, [loaded]);

  const fit = useCallback(() => {
    if (!plan || !stageSize) return;
    const pad = 48;
    const scale = Math.max(0.1, Math.min((stageSize.size.w - pad * 2) / plan.width, (stageSize.size.h - pad * 2) / plan.height));
    setCamera({ scale, x: (stageSize.size.w - plan.width * scale) / 2, y: (stageSize.size.h - plan.height * scale) / 2 });
  }, [plan?.width, plan?.height, stageSize]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fit(); }, [stageSize, plan?.width, plan?.height]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  /** Toute modification passe ici : historique (annuler/rétablir) + état « non enregistré ». */
  const commit = useCallback((fn, key) => {
    const now = Date.now();
    const merge = !!key && coalesce.current.key === key && now - coalesce.current.at < 800;
    coalesce.current = { key, at: now };
    setSt((s) => {
      const p = s.plan;
      const next = typeof fn === 'function' ? { ...p, elements: fn(p.elements) } : { ...p, ...fn };
      return { plan: next, past: merge ? s.past : [...s.past, snapshotOf(p)].slice(-HISTORY_MAX), future: [] };
    });
    setDirty(true);
  }, []);

  const undo = useCallback(() => {
    setSt((s) => (!s?.past.length ? s : { plan: { ...s.plan, ...s.past[s.past.length - 1] }, past: s.past.slice(0, -1), future: [snapshotOf(s.plan), ...s.future] }));
    setDirty(true);
  }, []);
  const redo = useCallback(() => {
    setSt((s) => (!s?.future.length ? s : { plan: { ...s.plan, ...s.future[0] }, past: [...s.past, snapshotOf(s.plan)], future: s.future.slice(1) }));
    setDirty(true);
  }, []);

  const center = () => {
    if (!stageSize) return { x: plan.width / 2, y: plan.height / 2 };
    return { x: Math.round((stageSize.size.w / 2 - camera.x) / camera.scale), y: Math.round((stageSize.size.h / 2 - camera.y) / camera.scale) };
  };
  const add = (type) => {
    const opts = {};
    if (type.startsWith('table')) opts.label = nextLabel(plan.elements, 'T');
    if (type === 'zone') opts.colorIndex = plan.elements.filter((e) => e.type === 'zone').length;
    const e = createElement(type, center(), opts);
    if (type === 'seat') { const r = nextRowLetter(plan.elements); e.properties.row = r; e.label = `${r}1`; }
    commit((els) => [...els, e]);
    setSelection([e.id]);
    setTool('select');
  };
  const remove = useCallback(() => {
    if (!selection.length) return;
    commit((els) => els.filter((e) => !selection.includes(e.id)));
    setSelection([]);
  }, [selection, commit]);
  const dup = useCallback(() => {
    if (!selection.length || !plan) return;
    const r = duplicate(plan.elements, selection);
    commit(() => r.elements);
    setSelection(r.ids);
  }, [selection, commit, plan]);
  const nudge = useCallback((dx, dy) => {
    if (!selection.length) return;
    commit((els) => els.map((e) => (selection.includes(e.id) ? { ...e, x: e.x + dx, y: e.y + dy } : e)), `nudge:${selection.join()}`);
  }, [selection, commit]);

  const save = useCallback(async (note) => {
    if (!plan) return false;
    setSaving(true);
    try {
      const r = await planService.saveDraft(planId, { name: plan.name, width: plan.width, height: plan.height, gridSize: plan.gridSize, elements: plan.elements, note });
      setDirty(false);
      toast.success('Brouillon enregistré', `Version ${r.version}`);
      const fresh = await planService.getDraft(planId);
      setPlan((p) => ({ ...p, versions: fresh.versions, updatedAt: fresh.updatedAt, elements: plan.kind === 'restaurant' ? fresh.elements : p.elements }));
      return true;
    } catch (e) { toast.error('Enregistrement impossible', e.message); return false; } finally { setSaving(false); }
  }, [plan, planId, toast]);

  const publish = async () => {
    const check = validatePlan({ ...plan, elements: plan.kind === 'restaurant' ? assignZones(plan.elements) : plan.elements });
    if (check.errors.length || check.warnings.length) { setIssues(check); if (check.errors.length) return; }
    if (dirty && !(await save('Avant publication'))) return;
    setSaving(true);
    try {
      const r = await planService.publish(planId);
      toast.success(`Plan publié (v${r.version})`, 'Les clients voient désormais cette version.');
      setIssues(null);
      reload(true);
    } catch (e) {
      if (e.details?.errors) setIssues(e.details); else toast.error('Publication refusée', e.message);
    } finally { setSaving(false); }
  };

  const restore = async (v) => {
    if (dirty && !window.confirm('Les modifications non enregistrées seront remplacées. Continuer ?')) return;
    try {
      const r = await planService.restore(planId, v.version);
      commit({ elements: r.elements, width: r.width, height: r.height });
      toast.info(`Version ${v.version} chargée`, 'Enregistrez puis publiez pour l’appliquer.');
    } catch (e) { toast.error('Restauration impossible', e.message); }
  };

  // Raccourcis clavier
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); dup(); }
      else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); }
      else if (e.key === 'Escape') setSelection([]);
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const s = (e.shiftKey ? 10 : 1) * (snap ? plan.gridSize : 1);
        nudge(e.key === 'ArrowLeft' ? -s : e.key === 'ArrowRight' ? s : 0, e.key === 'ArrowUp' ? -s : e.key === 'ArrowDown' ? s : 0);
      } else if (e.key.toLowerCase() === 'v') setTool('select');
      else if (e.key.toLowerCase() === 'h') setTool('pan');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, dup, save, remove, nudge, snap, plan?.gridSize]);

  if (loading && !plan) return <PageLoader label="Ouverture de l’éditeur…" />;
  if (error) return <div className="p-8"><ErrorState error={error} onRetry={reload} /></div>;
  if (!plan) return <PageLoader />;
  if (!canEditPlanKind(user, plan.kind)) return <div className="p-8"><ErrorState error={{ message: 'Votre rôle ne permet pas de modifier ce plan.' }} /></div>;

  const isCinema = plan.kind === 'cinema';
  const back = isCinema ? '/admin/salles' : '/admin/restaurants';
  const tools = isCinema
    ? [['seat', 'Siège', Armchair], ['row', 'Rangée', Rows3], ['screen', 'Écran', Monitor], ['door', 'Porte', DoorOpen], ['wall', 'Mur', BrickWall], ['label', 'Repère', Tag]]
    : [['table-round', 'Table ronde', Circle], ['table-square', 'Table carrée', Square], ['table-rect', 'Table longue', RectangleHorizontal], ['zone', 'Zone', LayoutGrid], ['wall', 'Mur', BrickWall], ['door', 'Porte', DoorOpen], ['bar', 'Bar / comptoir', Martini], ['plant', 'Plante', Flower2], ['label', 'Repère', Tag]];
  const tbtn = 'flex flex-col items-center gap-1 rounded-[3px] px-2 py-2 text-[0.625rem] font-medium text-mist hover:bg-ink-3 hover:text-paper';
  const ibtn = 'grid size-9 place-items-center rounded-lg text-mist hover:bg-ink-3 hover:text-paper disabled:opacity-30';
  const counts = isCinema ? `${plan.elements.filter((e) => e.type === 'seat').length} sièges` : `${plan.elements.filter((e) => e.type === 'table').length} tables · ${plan.elements.filter((e) => e.type === 'table').reduce((s, t) => s + t.capacity, 0)} couverts`;

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* Barre supérieure */}
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-ink-2 px-3 py-2">
        <Link to={back} onClick={(e) => { if (dirty && !window.confirm('Quitter sans enregistrer ?')) e.preventDefault(); }} className={ibtn} aria-label="Retour"><ArrowLeft className="size-4" /></Link>
        <div className="mr-auto min-w-0">
          <p className="truncate font-semibold">{plan.name}</p>
          <p className="text-xs text-mist">{counts} · {dirty ? <span className="text-warn">Modifications non enregistrées</span> : `Publié : v${plan.publishedVersion || 0}`}</p>
        </div>
        <div className="flex items-center gap-0.5 rounded-[3px] border border-line p-0.5">
          <button type="button" className={`${ibtn} ${tool === 'select' ? '!bg-paper !text-ink' : ''}`} onClick={() => setTool('select')} aria-label="Sélection (V)" title="Sélection (V)"><MousePointer2 className="size-4" /></button>
          <button type="button" className={`${ibtn} ${tool === 'pan' ? '!bg-paper !text-ink' : ''}`} onClick={() => setTool('pan')} aria-label="Déplacer la vue (H)" title="Déplacer la vue (H ou Espace)"><Hand className="size-4" /></button>
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" className={ibtn} onClick={undo} disabled={!hist.past.length} aria-label="Annuler" title="Annuler (Ctrl Z)"><Undo2 className="size-4" /></button>
          <button type="button" className={ibtn} onClick={redo} disabled={!hist.future.length} aria-label="Rétablir" title="Rétablir (Ctrl Y)"><Redo2 className="size-4" /></button>
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" className={ibtn} onClick={() => setCamera((c) => ({ ...c, scale: Math.max(0.15, c.scale / 1.25) }))} aria-label="Dézoomer"><Minus className="size-4" /></button>
          <span className="w-12 text-center text-xs tabular text-mist">{Math.round(camera.scale * 100)} %</span>
          <button type="button" className={ibtn} onClick={() => setCamera((c) => ({ ...c, scale: Math.min(4, c.scale * 1.25) }))} aria-label="Zoomer"><Plus className="size-4" /></button>
          <button type="button" className={ibtn} onClick={fit} aria-label="Ajuster à l’écran" title="Ajuster"><Maximize2 className="size-4" /></button>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview(true)}><Eye className="size-4" />Aperçu client</button>
        <button type="button" className="btn btn-light btn-sm" onClick={() => save()} disabled={saving || !dirty}>{saving ? <Spinner className="size-4" /> : <Save className="size-4" />}Enregistrer</button>
        {can(user, 'plans:publish') && <button type="button" className="btn btn-primary btn-sm" onClick={publish} disabled={saving}><Send className="size-4" />Publier</button>}
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Outils */}
        <nav aria-label="Ajouter un élément" className="flex w-20 shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-ink-2 p-2">
          {tools.map(([type, label, Icon]) => (
            <button key={type} type="button" className={tbtn} onClick={() => (type === 'row' ? setRowDialog({ row: nextRowLetter(plan.elements), count: 12, startNumber: 1, category: 'standard', seatW: 34, gap: 8, aisleAfter: 6 }) : add(type))}>
              <Icon className="size-5" />{label}
            </button>
          ))}
          {isCinema && <button type="button" className={tbtn} onClick={() => { commit((els) => renumberSeats(els)); toast.info('Sièges renumérotés', 'Rangées depuis l’écran, numéros de gauche à droite.'); }}><ListOrdered className="size-5" />Renuméroter</button>}
        </nav>

        {/* Zone de travail */}
        <div className="relative min-w-0 flex-1">
          <EditorCanvas plan={plan} selection={selection} setSelection={setSelection} onCommit={commit} tool={tool} snap={snap} camera={camera} setCamera={setCamera} onStageReady={setStageSize} />
          <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-ink-2/80 px-3 py-1 text-[0.6875rem] text-mist md:hidden">Éditeur conçu pour tablette et ordinateur</p>
        </div>

        {/* Panneau latéral */}
        <aside className="hidden w-80 shrink-0 flex-col border-l border-line bg-ink-2 md:flex">
          <div role="tablist" className="flex border-b border-line text-sm">
            {[['props', 'Propriétés'], ['plan', 'Plan'], ['versions', 'Versions']].map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={panel === k} onClick={() => setPanel(k)} className={`flex-1 py-3 font-medium ${panel === k ? 'border-b-2 border-violet-hi text-paper' : 'text-mist hover:text-paper'}`}>{l}</button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {panel === 'props' && (
              <PropertiesPanel
                elements={plan.elements}
                selection={selection}
                update={(id, patch) => commit((els) => els.map((e) => (e.id === id ? { ...e, ...patch } : e)), `prop:${id}:${Object.keys(patch).join()}`)}
                updateMany={(patch) => commit((els) => els.map((e) => (selection.includes(e.id) ? { ...e, ...patch } : e)))}
                onAlign={(m) => commit((els) => align(els, selection, m))}
                onDistribute={(a) => commit((els) => distribute(els, selection, a))}
                onDuplicate={dup}
                onDelete={remove}
              />
            )}
            {panel === 'plan' && (
              <div className="space-y-4 p-4">
                <FieldGroup label="Nom" htmlFor="pl-n"><input id="pl-n" className="field" value={plan.name} onChange={(e) => { setPlan({ ...plan, name: e.target.value }); setDirty(true); }} /></FieldGroup>
                <div className="grid grid-cols-2 gap-2">
                  <FieldGroup label="Largeur" htmlFor="pl-w"><input id="pl-w" type="number" min="300" className="field" value={plan.width} onChange={(e) => commit({ width: Math.max(300, Number(e.target.value) || 300) }, 'width')} /></FieldGroup>
                  <FieldGroup label="Hauteur" htmlFor="pl-h"><input id="pl-h" type="number" min="200" className="field" value={plan.height} onChange={(e) => commit({ height: Math.max(200, Number(e.target.value) || 200) }, 'height')} /></FieldGroup>
                  <FieldGroup label="Grille" htmlFor="pl-g"><input id="pl-g" type="number" min="2" max="50" className="field" value={plan.gridSize} onChange={(e) => { setPlan({ ...plan, gridSize: Math.max(2, Number(e.target.value) || 10) }); setDirty(true); }} /></FieldGroup>
                  <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" className="size-4 accent-[#A855F7]" checked={snap} onChange={(e) => setSnap(e.target.checked)} />Aimanter</label>
                </div>
                <p className="text-xs text-mist">Les coordonnées sont exprimées dans cette scène de référence : le plan s’adapte à tous les écrans côté client.</p>
                {isCinema && hall && (
                  <div className="space-y-2 border-t border-line pt-4">
                    <p className="text-sm font-semibold">Tarifs par catégorie</p>
                    {Object.keys(SEAT_CATEGORIES).map((k) => (
                      <FieldGroup key={k} label={`${SEAT_CATEGORIES[k].label} (FCFA)`} htmlFor={`pr-${k}`}><input id={`pr-${k}`} type="number" min="0" step="500" className="field" value={hall.prices[k] ?? ''} onChange={(e) => setHall({ ...hall, prices: { ...hall.prices, [k]: Number(e.target.value) } })} /></FieldGroup>
                    ))}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { try { await hallService.update(hall.id, { prices: hall.prices }); toast.success('Tarifs enregistrés', 'Appliqués aux nouvelles séances.'); } catch (e) { toast.error('Erreur', e.message); } }}>Enregistrer les tarifs</button>
                  </div>
                )}
              </div>
            )}
            {panel === 'versions' && (
              <ul className="divide-y divide-line">
                {[...(plan.versions || [])].reverse().map((v) => (
                  <li key={v.version} className="flex items-center justify-between gap-2 p-4 text-sm">
                    <div>
                      <p className="font-semibold">v{v.version} <span className={`ml-1 text-xs ${v.status === 'published' ? 'text-ok' : 'text-mist'}`}>{v.status === 'published' ? 'publiée' : v.status === 'archived' ? 'archivée' : 'brouillon'}</span></p>
                      <p className="text-xs text-mist">{formatDateTime(v.savedAt)} · {v.savedBy}</p>
                      {v.note && <p className="text-xs text-mist">{v.note}</p>}
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => restore(v)}><History className="size-3.5" />Charger</button>
                  </li>
                ))}
                {!plan.versions?.length && <li className="p-4 text-sm text-mist">Aucune version enregistrée.</li>}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <Modal open={!!rowDialog} onClose={() => setRowDialog(null)} title="Ajouter une rangée">
        {rowDialog && (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); const c = center(); commit((els) => addRow(els, { ...rowDialog, cx: c.x, y: c.y })); setRowDialog(null); }}>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Lettre du rang" htmlFor="rw-r"><input id="rw-r" className="field uppercase" value={rowDialog.row} onChange={(e) => setRowDialog({ ...rowDialog, row: e.target.value.toUpperCase() })} /></FieldGroup>
              <FieldGroup label="Nombre de sièges" htmlFor="rw-c"><input id="rw-c" type="number" min="1" max="60" className="field" value={rowDialog.count} onChange={(e) => setRowDialog({ ...rowDialog, count: e.target.value })} /></FieldGroup>
              <FieldGroup label="Premier numéro" htmlFor="rw-s"><input id="rw-s" type="number" min="1" className="field" value={rowDialog.startNumber} onChange={(e) => setRowDialog({ ...rowDialog, startNumber: e.target.value })} /></FieldGroup>
              <FieldGroup label="Catégorie" htmlFor="rw-cat"><select id="rw-cat" className="field" value={rowDialog.category} onChange={(e) => setRowDialog({ ...rowDialog, category: e.target.value })}>{Object.entries(SEAT_CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}</select></FieldGroup>
              <FieldGroup label="Largeur d’un siège" htmlFor="rw-w"><input id="rw-w" type="number" min="16" className="field" value={rowDialog.seatW} onChange={(e) => setRowDialog({ ...rowDialog, seatW: e.target.value })} /></FieldGroup>
              <FieldGroup label="Espacement" htmlFor="rw-g"><input id="rw-g" type="number" min="0" className="field" value={rowDialog.gap} onChange={(e) => setRowDialog({ ...rowDialog, gap: e.target.value })} /></FieldGroup>
              <FieldGroup label="Allée après le siège n°" htmlFor="rw-a" hint="0 = pas d’allée"><input id="rw-a" type="number" min="0" className="field" value={rowDialog.aisleAfter} onChange={(e) => setRowDialog({ ...rowDialog, aisleAfter: e.target.value })} /></FieldGroup>
            </div>
            <button type="submit" className="btn btn-primary">Ajouter au centre de la vue</button>
          </form>
        )}
      </Modal>

      <Modal open={preview} onClose={() => setPreview(false)} title="Aperçu côté client" size="max-w-5xl">
        <p className="mb-4 text-sm text-mist">Rendu du brouillon actuel tel qu’il apparaîtra aux clients après publication.</p>
        <div className="overflow-hidden rounded-[4px] border border-line">
          {isCinema
            ? <SeatMap plan={plan} occupied={new Set()} locked={new Set()} selected={new Set()} onToggle={() => {}} prices={hall?.prices} height="60vh" />
            : <RestaurantFloor plan={{ ...plan, elements: assignZones(plan.elements) }} height="60vh" />}
        </div>
      </Modal>

      <Modal open={!!issues} onClose={() => setIssues(null)} title={issues?.errors?.length ? 'Publication impossible' : 'Points à vérifier'}>
        {issues && (
          <div className="space-y-4 text-sm">
            {issues.errors?.length > 0 && <ul className="list-disc space-y-1 pl-5 text-danger">{issues.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
            {issues.warnings?.length > 0 && <ul className="list-disc space-y-1 pl-5 text-warn">{issues.warnings.map((e) => <li key={e}>{e}</li>)}</ul>}
            {!issues.errors?.length && <p className="text-mist">Ces avertissements n’empêchent pas la publication.</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
