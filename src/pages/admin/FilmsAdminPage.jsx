import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { filmService } from '../../services';
import { useToast } from '../../contexts/ToastContext';
import { ErrorState, FieldGroup, Modal, PageLoader, Spinner } from '../../components/common';
import FilmPoster from '../../components/cinema/FilmPoster';
import { AdminHeader } from './AdminLayout';
import { formatDuration, formatLongDate, toDateKey } from '../../utils/format';

const RATINGS = ['Tous publics', 'Déconseillé -12 ans', 'Déconseillé -16 ans', 'Interdit -18 ans'];
const MOTIFS = ['sun', 'wave', 'beam', 'orbit', 'stripes', 'leaf', 'moon', 'grid'];
const empty = { title: '', synopsis: '', director: '', cast: '', genres: '', duration: 100, rating: RATINGS[0], releaseDate: toDateKey(new Date()), status: 'showing', posterUrl: '', trailerUrl: '', poster: { bg: '#1f0a33', ink: '#F8F6FA', accent: '#A855F7', motif: 'sun' } };

function FilmForm({ initial, onSave, onCancel }) {
  const [v, setV] = useState(() => ({ ...empty, ...initial, cast: (initial?.cast || []).join(', '), genres: (initial?.genres || []).join(', ') }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const setP = (k) => (e) => setV({ ...v, poster: { ...v.poster, [k]: e.target.value } });
  const submit = async (e) => {
    e.preventDefault();
    if (!v.title.trim() || !v.synopsis.trim() || !v.genres.trim()) { setErr('Titre, synopsis et genre sont obligatoires.'); return; }
    if (v.trailerUrl && !/^https?:\/\//.test(v.trailerUrl)) { setErr('URL de bande-annonce invalide.'); return; }
    setBusy(true);
    try {
      await onSave({ ...v, duration: Number(v.duration), cast: v.cast.split(',').map((s) => s.trim()).filter(Boolean), genres: v.genres.split(',').map((s) => s.trim()).filter(Boolean) });
    } catch (e2) { setErr(e2.message); setBusy(false); }
  };
  const preview = { ...v, genres: v.genres.split(',').map((s) => s.trim()).filter(Boolean) };
  return (
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-[1fr_12rem]">
      <div className="flex flex-col gap-4">
        <FieldGroup label="Titre" htmlFor="f-t"><input id="f-t" className="field" value={v.title} onChange={set('title')} /></FieldGroup>
        <FieldGroup label="Synopsis" htmlFor="f-s"><textarea id="f-s" rows="3" className="field" value={v.synopsis} onChange={set('synopsis')} /></FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup label="Réalisation" htmlFor="f-d"><input id="f-d" className="field" value={v.director} onChange={set('director')} /></FieldGroup>
          <FieldGroup label="Casting (virgules)" htmlFor="f-c"><input id="f-c" className="field" value={v.cast} onChange={set('cast')} /></FieldGroup>
          <FieldGroup label="Genres (virgules)" htmlFor="f-g"><input id="f-g" className="field" value={v.genres} onChange={set('genres')} /></FieldGroup>
          <FieldGroup label="Durée (min)" htmlFor="f-du"><input id="f-du" type="number" min="1" className="field" value={v.duration} onChange={set('duration')} /></FieldGroup>
          <FieldGroup label="Classification" htmlFor="f-r"><select id="f-r" className="field" value={v.rating} onChange={set('rating')}>{RATINGS.map((r) => <option key={r}>{r}</option>)}</select></FieldGroup>
          <FieldGroup label="Date de sortie" htmlFor="f-rd"><input id="f-rd" type="date" className="field" value={v.releaseDate} onChange={set('releaseDate')} /></FieldGroup>
          <FieldGroup label="Statut" htmlFor="f-st"><select id="f-st" className="field" value={v.status} onChange={set('status')}><option value="showing">À l’affiche</option><option value="coming">Prochainement</option></select></FieldGroup>
          <FieldGroup label="Bande-annonce (YouTube, Vimeo ou .mp4)" htmlFor="f-tr"><input id="f-tr" className="field" placeholder="https://…" value={v.trailerUrl} onChange={set('trailerUrl')} /></FieldGroup>
        </div>
        <FieldGroup label="Affiche (URL d’image, sinon affiche typographique)" htmlFor="f-pu"><input id="f-pu" className="field" placeholder="https://…" value={v.posterUrl} onChange={set('posterUrl')} /></FieldGroup>
        {!v.posterUrl && (
          <div className="grid grid-cols-4 gap-3">
            {[['bg', 'Fond'], ['ink', 'Texte'], ['accent', 'Accent']].map(([k, l]) => <FieldGroup key={k} label={l} htmlFor={`f-${k}`}><input id={`f-${k}`} type="color" className="h-11 w-full rounded-[3px] border border-line bg-ink-2" value={v.poster[k]} onChange={setP(k)} /></FieldGroup>)}
            <FieldGroup label="Motif" htmlFor="f-m"><select id="f-m" className="field" value={v.poster.motif} onChange={setP('motif')}>{MOTIFS.map((m) => <option key={m}>{m}</option>)}</select></FieldGroup>
          </div>
        )}
        {err && <p role="alert" className="text-sm text-danger">{err}</p>}
        <div className="flex gap-2"><button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner className="size-4" />}Enregistrer</button><button type="button" className="btn btn-ghost" onClick={onCancel}>Annuler</button></div>
      </div>
      <div className="overflow-hidden rounded-[4px]"><FilmPoster film={{ ...preview, title: v.title || 'Titre' }} /></div>
    </form>
  );
}

export default function FilmsAdminPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => filmService.list(), []);
  const [editing, setEditing] = useState(null);

  const save = async (v) => {
    if (editing.id) await filmService.update(editing.id, v); else await filmService.create(v);
    toast.success('Film enregistré');
    setEditing(null);
    reload(true);
  };
  const remove = async (f) => {
    if (!window.confirm(`Supprimer « ${f.title} » et ses séances ?`)) return;
    try { await filmService.remove(f.id); toast.success('Film supprimé'); reload(true); } catch (e) { toast.error('Suppression impossible', e.message); }
  };

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div>
      <AdminHeader title="Films" description="Fiches, affiches, bandes-annonces et statut à l’affiche.">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})}><Plus className="size-4" />Ajouter un film</button>
      </AdminHeader>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {data.map((f) => (
          <article key={f.id} className="group">
            <div className="relative overflow-hidden rounded-[4px]">
              <FilmPoster film={f} />
              <div className="absolute inset-x-2 bottom-2 flex gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <button type="button" className="btn btn-light btn-sm flex-1" onClick={() => setEditing(f)}><Pencil className="size-3.5" />Modifier</button>
                <button type="button" className="btn btn-sm bg-ink/80 text-paper" onClick={() => remove(f)} aria-label={`Supprimer ${f.title}`}><Trash2 className="size-3.5" /></button>
              </div>
            </div>
            <p className="mt-3 font-semibold">{f.title}</p>
            <p className="text-xs text-mist">{f.status === 'showing' ? 'À l’affiche' : `Sortie ${formatLongDate(f.releaseDate)}`} · {formatDuration(f.duration)}</p>
          </article>
        ))}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Modifier le film' : 'Nouveau film'} size="max-w-4xl">
        {editing && <FilmForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
