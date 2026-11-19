import { useState } from 'react';
import { Play } from 'lucide-react';
import { Modal } from '../common';

/** Convertit une URL YouTube/Vimeo en URL d'intégration ; sinon la renvoie telle quelle (fichier vidéo). */
export function embedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (yt) return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0` };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type: 'iframe', src: `https://player.vimeo.com/video/${vm[1]}?autoplay=1` };
  return { type: 'video', src: url };
}

export default function TrailerButton({ film, compact = false }) {
  const [open, setOpen] = useState(false);
  const media = embedUrl(film.trailerUrl);
  if (!media) {
    return compact
      ? <span className="shrink-0 pt-1 text-xs text-mist" title="La bande-annonce n’a pas encore été ajoutée">Bande-annonce à venir</span>
      : <button type="button" className="btn btn-ghost" disabled title="La bande-annonce n’a pas encore été ajoutée"><Play className="size-4" />Bande-annonce à venir</button>;
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={compact ? 'grid size-10 shrink-0 place-items-center rounded-full border border-line hover:border-violet-hi hover:text-violet-hi' : 'btn btn-ghost'} aria-label={`Voir la bande-annonce de ${film.title}`}>
        <Play className="size-4" />{!compact && 'Bande-annonce'}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={film.title} size="max-w-4xl">
        <div className="aspect-video overflow-hidden rounded-[4px] bg-ink">
          {media.type === 'iframe'
            ? <iframe src={media.src} title={`Bande-annonce de ${film.title}`} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            : <video src={media.src} controls autoPlay className="h-full w-full" />}
        </div>
      </Modal>
    </>
  );
}
