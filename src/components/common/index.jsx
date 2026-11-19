import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { openSurface } from '../../animations/interactionAnimations';

/** Monogramme : couronne réduite à trois pointes, dessinée en un trait. */
export function Logo({ className = '', withWord = true }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <path d="M5 24V9l5.5 7L16 6l5.5 10L27 9v15z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" className="text-gold" />
        <path d="M5 27.5h22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-gold" />
      </svg>
      {withWord && <span className="font-display text-[1.35rem] leading-none tracking-[0.02em]">Monarque</span>}
    </span>
  );
}

export function Spinner({ className = 'size-5', label = 'Chargement' }) {
  return (
    <span role="status" className="inline-flex items-center">
      <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden>
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
        <path d="M21.5 12A9.5 9.5 0 0 0 12 2.5" fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageLoader({ label = 'Chargement…' }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-mist">
      <Spinner className="size-8" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Impossible de charger cette page' }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <AlertTriangle className="size-8 text-danger" aria-hidden />
      <h2 className="display-sm text-2xl">{title}</h2>
      <p className="text-mist">{error?.message || 'Une erreur inattendue est survenue.'}</p>
      {onRetry && <button type="button" className="btn btn-ghost" onClick={() => onRetry()}>Réessayer</button>}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[4px] border border-dashed border-line px-6 py-14 text-center">
      <p className="display-sm text-2xl">{title}</p>
      {children && <p className="max-w-md text-mist">{children}</p>}
      {action}
    </div>
  );
}

/** Image avec fondu au chargement et repli si l'URL ne répond pas. */
export function Img({ src, alt, className = '', imgClassName = '', sizes, eager = false, ...rest }) {
  const [state, setState] = useState('loading');
  const srcSet = src?.includes('images.unsplash.com')
    ? [640, 1024, 1600].map((w) => `${src.replace(/w=\d+/, `w=${w}`)} ${w}w`).join(', ')
    : undefined;
  return (
    <div className={`relative overflow-hidden bg-ink-3 ${className}`}>
      {state !== 'error' ? (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes || '(max-width: 768px) 100vw, 50vw'}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          className={`h-full w-full object-cover transition-opacity duration-700 ${state === 'ok' ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
          {...rest}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-mist">Image indisponible</div>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'max-w-lg', labelledBy }) {
  const ref = useRef(null);
  useLayoutEffect(() => { if (open && ref.current) { const t = openSurface(ref.current, { origin: 'center' }); return () => t?.kill(); } return undefined; }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => ref.current?.querySelector('button, input, select, textarea, a[href]')?.focus(), 30);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-ink/75 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy || 'modal-title'} className={`relative max-h-[92dvh] w-full ${size} overflow-auto rounded-t-[6px] border border-line bg-ink-2 p-6 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] sm:rounded-[6px] sm:p-8`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          {title && <h2 id="modal-title" className="display-sm text-2xl">{title}</h2>}
          <button type="button" onClick={onClose} className="-mr-2 rounded-full p-2 text-mist hover:bg-ink-3 hover:text-paper" aria-label="Fermer"><X className="size-5" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export const STATUS_LABELS = {
  pending_payment: ['En attente de paiement', 'bg-warn/15 text-warn'],
  confirmed: ['Confirmée', 'bg-ok/15 text-ok'],
  cancelled: ['Annulée', 'bg-mist/15 text-mist'],
  expired: ['Expirée', 'bg-mist/15 text-mist'],
  completed: ['Terminée', 'bg-violet/20 text-violet-hi'],
  refunding: ['En cours de remboursement', 'bg-warn/15 text-warn'],
  pending: ['En attente', 'bg-warn/15 text-warn'],
  succeeded: ['Réussi', 'bg-ok/15 text-ok'],
  failed: ['Échoué', 'bg-danger/15 text-danger'],
  refund_pending: ['Remboursement en cours', 'bg-warn/15 text-warn'],
  refunded: ['Remboursé', 'bg-violet/20 text-violet-hi'],
};

export function StatusBadge({ status }) {
  const [label, cls] = STATUS_LABELS[status] || [status, 'bg-ink-3 text-mist'];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

export function FieldGroup({ label, error, hint, children, htmlFor }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-paper">{label}</label>
      {children}
      {error ? <p className="text-xs text-danger" role="alert">{error}</p> : hint ? <p className="text-xs text-mist">{hint}</p> : null}
    </div>
  );
}

export function PriceRange({ value }) {
  return (
    <span aria-label={`Gamme de prix ${value} sur 4`} className="tabular tracking-widest">
      <span className="text-paper">{'F'.repeat(value)}</span><span className="text-line">{'F'.repeat(4 - value)}</span>
    </span>
  );
}

export function DemoTag({ children = 'Démo', className = '' }) {
  return <span className={`inline-flex items-center rounded-full border border-warn/40 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-warn ${className}`}>{children}</span>;
}
