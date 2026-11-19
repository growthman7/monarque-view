import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FieldGroup, Spinner } from '../../components/common';
import { DEMO_MODE } from '../../services/api/client';
import { DEMO_ACCOUNTS, PHOTOS, unsplash } from '../../services/demo/seed';
import { ROLES, isStaff } from '../../utils/permissions';
import { isEmail } from '../../utils/validation';

export function AuthShell({ title, children, aside }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={unsplash(PHOTOS.cinemaScreen)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-violet-deep/40" />
        <div className="absolute bottom-12 left-12 right-12"><p className="display text-6xl">{aside}</p></div>
      </div>
      <div className="flex items-center justify-center px-4 pb-16 pt-28 sm:px-10">
        <div className="w-full max-w-md">
          <h1 className="display text-6xl">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login, demoLogin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const go = (u) => nav(loc.state?.from || (isStaff(u) ? '/admin' : '/compte'), { replace: true });

  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email) || !password) { setErr('Saisissez votre e-mail et votre mot de passe.'); return; }
    setBusy(true);
    setErr(null);
    try { go(await login(email, password)); } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  const demo = async (a) => {
    setBusy(true);
    try { go(await demoLogin(a.email)); } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Connexion" aside="Vos séances, vos tables, au même endroit.">
      <form onSubmit={submit} noValidate className="mt-10 flex flex-col gap-5">
        <FieldGroup label="Adresse e-mail" htmlFor="l-email"><input id="l-email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} /></FieldGroup>
        <FieldGroup label="Mot de passe" htmlFor="l-pw"><input id="l-pw" type="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} /></FieldGroup>
        {err && <p role="alert" className="text-sm text-danger">{err}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner className="size-4" />}Se connecter</button>
      </form>
      <p className="mt-6 text-sm text-mist">Pas encore de compte ? <Link to="/inscription" state={loc.state} className="font-semibold text-violet-hi underline">Créer un compte</Link></p>
      <p className="mt-2 text-sm text-mist">Vous pouvez aussi réserver sans compte.</p>

      {DEMO_MODE && (
        <div className="mt-10 border-t border-line pt-6">
          <p className="label">Comptes de démonstration</p>
          <p className="mt-1 text-xs text-mist">Connexion en un clic pour tester chaque rôle et ses permissions.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.id} type="button" disabled={busy} onClick={() => demo(a)} className="rounded-[3px] border border-line px-3 py-2.5 text-left text-sm transition-colors hover:border-violet-hi hover:bg-violet/10">
                <span className="block font-semibold">{ROLES[a.role]}</span>
                <span className="block text-xs text-mist">{a.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
}
