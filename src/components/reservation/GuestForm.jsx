import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FieldGroup, Spinner } from '../common';
import { validateGuest } from '../../utils/validation';

export default function GuestForm({ initial, onSubmit, busy, user, returnTo }) {
  const [v, setV] = useState({ name: initial?.name || '', email: initial?.email || '', phone: initial?.phone || '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const set = (k) => (e) => {
    const next = { ...v, [k]: e.target.value };
    setV(next);
    if (touched[k]) setErrors(validateGuest(next));
  };
  const blur = (k) => () => { setTouched((t) => ({ ...t, [k]: true })); setErrors(validateGuest(v)); };
  const submit = (e) => {
    e.preventDefault();
    const errs = validateGuest(v);
    setErrors(errs);
    setTouched({ name: true, email: true, phone: true });
    if (!Object.keys(errs).length) onSubmit(v);
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {!user && (
        <p className="rounded-[4px] border border-line bg-ink-3/60 p-4 text-sm text-mist">
          Pas besoin de compte. Vous avez déjà un compte ?{' '}
          <Link to="/connexion" state={{ from: returnTo }} className="font-semibold text-violet-hi underline">Connectez-vous</Link> pour retrouver la réservation dans votre historique.
        </p>
      )}
      <FieldGroup label="Nom complet" htmlFor="g-name" error={touched.name && errors.name}>
        <input id="g-name" className="field" autoComplete="name" value={v.name} onChange={set('name')} onBlur={blur('name')} aria-invalid={!!(touched.name && errors.name)} />
      </FieldGroup>
      <div className="grid gap-5 sm:grid-cols-2">
        <FieldGroup label="Adresse e-mail" htmlFor="g-email" error={touched.email && errors.email} hint="Le billet et la confirmation y seront envoyés.">
          <input id="g-email" type="email" className="field" autoComplete="email" inputMode="email" value={v.email} onChange={set('email')} onBlur={blur('email')} aria-invalid={!!(touched.email && errors.email)} />
        </FieldGroup>
        <FieldGroup label="Téléphone" htmlFor="g-phone" error={touched.phone && errors.phone} hint="Utile en cas de changement de dernière minute.">
          <input id="g-phone" type="tel" className="field" autoComplete="tel" inputMode="tel" placeholder="+225 07 00 00 00 00" value={v.phone} onChange={set('phone')} onBlur={blur('phone')} aria-invalid={!!(touched.phone && errors.phone)} />
        </FieldGroup>
      </div>
      <button type="submit" className="btn btn-light self-start" disabled={busy}>{busy && <Spinner className="size-4" />}Valider mes coordonnées</button>
    </form>
  );
}
