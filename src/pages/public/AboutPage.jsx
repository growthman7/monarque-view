import { Link } from 'react-router-dom';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import { Img } from '../../components/common';
import { PHOTOS, unsplash } from '../../services/demo/seed';

export default function AboutPage() {
  const scope = useScrollAnimation();
  return (
    <div ref={scope} className="pt-32">
      <section className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <p className="label">À propos</p>
        <h1 data-reveal="lines" className="display mt-4 max-w-5xl text-[clamp(3.5rem,9vw,9rem)]">Une place n’est <em>jamais</em> un détail.</h1>
      </section>
      <section className="mx-auto mt-20 grid max-w-[1440px] gap-10 px-4 sm:px-8 lg:grid-cols-2">
        <div data-reveal="mask" data-tilt="5" className="overflow-hidden rounded-[4px]">
          <Img src={unsplash(PHOTOS.cinemaScreen)} alt="Salle de cinéma face à l’écran" className="aspect-[4/5]" />
        </div>
        <div className="flex flex-col justify-center gap-6 text-lg text-paper/85">
          <p data-reveal="fade">Au cinéma, deux rangs d’écart changent un film. Au restaurant, une table près de la fenêtre change une soirée. Pourtant, la plupart des réservations se font encore à l’aveugle.</p>
          <p data-reveal="fade">MONARQUE réunit des salles et des restaurants qui acceptent de montrer leur plan réel. Chaque établissement dessine son espace dans notre éditeur : rangées, fauteuils, terrasse, salon privé. Ce que vous voyez à l’écran est ce que vous trouverez sur place.</p>
          <p data-reveal="fade">Votre sélection est bloquée pour vous pendant que vous payez, et personne d’autre ne peut la prendre. Si vous abandonnez, elle se libère d’elle-même quelques minutes plus tard.</p>
          <div data-reveal="fade" className="flex flex-wrap gap-3 pt-4">
            <Link to="/cinema" className="btn btn-primary">Réserver une séance</Link>
            <Link to="/restaurants" className="btn btn-ghost">Réserver une table</Link>
          </div>
        </div>
      </section>
      <section className="mx-auto mt-28 grid max-w-[1440px] gap-px overflow-hidden rounded-[4px] border border-line bg-line px-0 sm:mx-8 md:grid-cols-3">
        {[
          ['Le plan réel', 'Dessiné par l’établissement, mis à jour quand la salle change.'],
          ['Aucune double réservation', 'Une place ne peut être tenue que par une seule personne à la fois.'],
          ['Paiement local', 'Mobile Money et cartes via SycaPay, selon les moyens confirmés par la passerelle.'],
        ].map(([t, d]) => (
          <div key={t} className="bg-ink p-8 sm:p-10">
            <h2 className="display-sm text-3xl">{t}</h2>
            <p className="mt-3 text-mist">{d}</p>
          </div>
        ))}
      </section>
      <div className="h-28" />
    </div>
  );
}
