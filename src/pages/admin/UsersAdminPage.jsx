import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { adminService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ErrorState, FieldGroup, Modal, PageLoader, Spinner } from '../../components/common';
import { AdminHeader } from './AdminLayout';
import { PERMISSIONS, ROLES } from '../../utils/permissions';
import { formatLongDate } from '../../utils/format';
import { isEmail, validatePassword } from '../../utils/validation';

export default function UsersAdminPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => adminService.users(), []);
  const [creating, setCreating] = useState(false);
  const [v, setV] = useState({ name: '', email: '', phone: '', role: 'agent', password: '' });
  const [busy, setBusy] = useState(false);

  const changeRole = async (u, role) => {
    try { await adminService.updateUser(u.id, { role }); toast.success('Rôle modifié', `${u.name} : ${ROLES[role]}`); reload(true); } catch (e) { toast.error('Modification refusée', e.message); }
  };
  const create = async (e) => {
    e.preventDefault();
    const pw = validatePassword(v.password);
    if (!v.name.trim() || !isEmail(v.email) || pw) { toast.error('Formulaire incomplet', pw || 'Nom et e-mail valides requis.'); return; }
    setBusy(true);
    try { await adminService.createUser(v); toast.success('Compte créé'); setCreating(false); setV({ name: '', email: '', phone: '', role: 'agent', password: '' }); reload(true); } catch (e2) { toast.error('Création impossible', e2.message); } finally { setBusy(false); }
  };

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div>
      <AdminHeader title="Utilisateurs & rôles" description="Les permissions sont revérifiées par le serveur à chaque action.">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}><Plus className="size-4" />Créer un compte équipe</button>
      </AdminHeader>
      <div className="overflow-x-auto rounded-[4px] border border-line">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="bg-ink-2 text-mist"><tr>{['Nom', 'E-mail', 'Inscrit le', 'Rôle'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {data.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-semibold">{u.name}</td>
                <td className="px-4">{u.email}</td>
                <td className="px-4">{formatLongDate(u.createdAt)}</td>
                <td className="px-4">
                  <select className="field !min-h-9 !py-1" value={u.role} disabled={u.id === user.id} onChange={(e) => changeRole(u, e.target.value)} aria-label={`Rôle de ${u.name}`}>
                    {Object.entries(ROLES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="mt-10">
        <h2 className="display-sm text-2xl">Permissions par rôle</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(PERMISSIONS).filter(([r]) => r !== 'customer').map(([r, perms]) => (
            <div key={r} className="panel p-5"><p className="font-semibold">{ROLES[r]}</p><p className="mt-2 text-xs leading-relaxed text-mist">{perms.join(' · ')}</p></div>
          ))}
        </div>
      </section>
      <Modal open={creating} onClose={() => setCreating(false)} title="Nouveau compte équipe">
        <form onSubmit={create} className="flex flex-col gap-4">
          <FieldGroup label="Nom complet" htmlFor="u-n"><input id="u-n" className="field" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></FieldGroup>
          <FieldGroup label="E-mail" htmlFor="u-e"><input id="u-e" type="email" className="field" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></FieldGroup>
          <FieldGroup label="Rôle" htmlFor="u-r"><select id="u-r" className="field" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })}>{Object.entries(ROLES).filter(([k]) => k !== 'customer').map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></FieldGroup>
          <FieldGroup label="Mot de passe provisoire" htmlFor="u-p" hint="8 caractères, lettres et chiffres. À changer à la première connexion."><input id="u-p" type="password" autoComplete="new-password" className="field" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /></FieldGroup>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner className="size-4" />}Créer</button>
        </form>
      </Modal>
    </div>
  );
}
