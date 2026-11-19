import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { filmService, hallService, sessionService } from '../../services';
import { useToast } from '../../contexts/ToastContext';
import { EmptyState, ErrorState, FieldGroup, PageLoader, Spinner } from '../../components/common';
import { AdminHeader } from './AdminLayout';
import { addDays, formatPrice, formatShortDay, formatTime, toDateKey } from '../../utils/format';

export default function SessionsAdminPage() {
  const toast = useToast();
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => toDateKey(addDays(new Date(), i))), []);
  const [day, setDay] = useState(days[0]);
  const { data, loading, error, reload } = useAsync(async () => {
    const [films, halls, sessions] = await Promise.all([filmService.list(), hallService.list(), sessionService.list({ from: new Date(`${days[0]}T00:00`).toISOString() })]);
    return { films, halls, sessions };
  }, []);
  const [form, setForm] = useState({ filmId: '', hallId: '', date: days[0], time: '20:00', format: '2D', language: 'VF' });
  const [busy, setBusy] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    if (!form.filmId || !form.hallId) { toast.error('Choisissez un film et une salle'); return; }
    setBusy(true);
    try { await sessionService.create(form); toast.success('Séance programmée'); reload(true); } catch (e2) { toast.error('Programmation impossible', e2.message); } finally { setBusy(false); }
  };
  const remove = async (s) => {
    if (!window.confirm('Supprimer cette séance ?')) return;
    try { await sessionService.remove(s.id); toast.success('Séance supprimée'); reload(true); } catch (e) { toast.error('Suppression impossible', e.message); }
  };

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const filmName = (id) => data.films.find((f) => f.id === id)?.title || '—';
  const list = data.sessions.filter((s) => toDateKey(s.startsAt) === day);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const hall = data.halls.find((h) => h.id === form.hallId);

  return (
    <div>
      <AdminHeader title="Séances" description="Programmation par salle. Un chevauchement dans la même salle est refusé." />
      <div className="grid gap-8 xl:grid-cols-[1fr_22rem]">
        <div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => <button key={d} type="button" className="chip shrink-0" aria-pressed={day === d} onClick={() => setDay(d)}>{formatShortDay(`${d}T12:00`)}</button>)}
          </div>
          {!list.length ? <div className="mt-6"><EmptyState title="Aucune séance ce jour" /></div> : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-mist"><tr><th className="py-2 font-medium">Heure</th><th className="font-medium">Film</th><th className="font-medium">Salle</th><th className="font-medium">Version</th><th className="font-medium">Places libres</th><th /></tr></thead>
                <tbody className="divide-y divide-line">
                  {list.map((s) => (
                    <tr key={s.id}>
                      <td className="py-3 font-semibold tabular">{formatTime(s.startsAt)}</td><td>{filmName(s.filmId)}</td><td>{s.hall}</td><td>{s.format} · {s.language}</td>
                      <td className="tabular">{s.remaining} / {s.capacity}</td>
                      <td className="text-right"><button type="button" className="rounded-full p-2 text-mist hover:text-danger" onClick={() => remove(s)} aria-label="Supprimer la séance"><Trash2 className="size-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <form onSubmit={create} className="panel flex h-fit flex-col gap-4 p-6">
          <h2 className="display-sm text-2xl">Programmer</h2>
          <FieldGroup label="Film" htmlFor="s-f"><select id="s-f" className="field" value={form.filmId} onChange={set('filmId')}><option value="">Choisir…</option>{data.films.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}</select></FieldGroup>
          <FieldGroup label="Salle" htmlFor="s-h"><select id="s-h" className="field" value={form.hallId} onChange={set('hallId')}><option value="">Choisir…</option>{data.halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Date" htmlFor="s-d"><input id="s-d" type="date" className="field" value={form.date} onChange={set('date')} /></FieldGroup>
            <FieldGroup label="Heure" htmlFor="s-t"><input id="s-t" type="time" className="field" value={form.time} onChange={set('time')} /></FieldGroup>
            <FieldGroup label="Format" htmlFor="s-fo"><input id="s-fo" className="field" value={form.format} onChange={set('format')} /></FieldGroup>
            <FieldGroup label="Langue" htmlFor="s-l"><select id="s-l" className="field" value={form.language} onChange={set('language')}><option>VF</option><option>VOST</option><option>VO</option></select></FieldGroup>
          </div>
          {hall && <p className="text-xs text-mist">Tarifs de la salle : {Object.entries(hall.prices).map(([k, v]) => `${k} ${formatPrice(v)}`).join(' · ')}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? <Spinner className="size-4" /> : <Plus className="size-4" />}Ajouter la séance</button>
        </form>
      </div>
    </div>
  );
}
