import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center px-4 pt-24 text-center">
      <p className="display text-[clamp(6rem,22vw,14rem)] text-violet-hi">404</p>
      <h1 className="display-sm text-3xl">Cette page n’a pas de place réservée.</h1>
      <p className="mt-3 text-mist">Le lien est peut-être ancien, ou l’adresse a été mal saisie.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn btn-primary">Retour à l’accueil</Link>
        <Link to="/reservation/retrouver" className="btn btn-ghost">Retrouver une réservation</Link>
      </div>
    </section>
  );
}
