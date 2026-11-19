import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FieldGroup, Spinner } from '../../components/common';
import { AuthShell } from './LoginPage';
import { validateGuest, validatePassword } from '../../utils/validation';

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [v, setV] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateGuest(v);
    const pw = validatePassword(v.password);
    if (pw) errs.password = pw;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setErr(null);
    try {
      await register(v);
      nav(loc.state?.from || '/compte', { replace: true });
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Créer un compte" aside="Gardez l’historique de vos soirées.">
      <form onSubmit={submit} noValidate className="mt-10 flex flex-col gap-5">
        <FieldGroup label="Nom complet" htmlFor="r-name" error={errors.name}><input id="r-name" className="field" autoComplete="name" value={v.name} onChange={set('name')} aria-invalid={!!errors.name} /></FieldGroup>
        <FieldGroup label="Adresse e-mail" htmlFor="r-email" error={errors.email}><input id="r-email" type="email" className="field" autoComplete="email" value={v.email} onChange={set('email')} aria-invalid={!!errors.email} /></FieldGroup>
        <FieldGroup label="Téléphone" htmlFor="r-phone" error={errors.phone}><input id="r-phone" type="tel" className="field" autoComplete="tel" value={v.phone} onChange={set('phone')} aria-invalid={!!errors.phone} /></FieldGroup>
        <FieldGroup label="Mot de passe" htmlFor="r-pw" error={errors.password} hint="8 caractères minimum, lettres et chiffres."><input id="r-pw" type="password" className="field" autoComplete="new-password" value={v.password} onChange={set('password')} aria-invalid={!!errors.password} /></FieldGroup>
        {err && <p role="alert" className="text-sm text-danger">{err}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner className="size-4" />}Créer mon compte</button>
      </form>
      <p className="mt-6 text-sm text-mist">Déjà inscrit ? <Link to="/connexion" state={loc.state} className="font-semibold text-violet-hi underline">Se connecter</Link></p>
    </AuthShell>
  );
}
