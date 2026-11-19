import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Clapperboard, LayoutDashboard, Search, Ticket, UserRound, UtensilsCrossed, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isStaff } from '../../utils/permissions';
import { gsap, ScrollTrigger, EASE, prefersReducedMotion } from '../../animations/animationConfig';
import { openSurface } from '../../animations/interactionAnimations';

const LINKS = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/cinema', label: 'Cinéma' },
  { to: '/restaurants', label: 'Restaurants' },
  { to: '/a-propos', label: 'À propos' },
];

/** Mot-symbole centré, sous-titre en petites capitales (comme le modèle). */
export function Wordmark({ className = '' }) {
  return (
    <span className={`flex flex-col items-center leading-none ${className}`}>
      <span className="font-display text-[1.55rem] tracking-[0.01em] sm:text-[1.75rem]">Monarque</span>
      <span className="mt-1 text-[0.5625rem] font-semibold uppercase tracking-[0.32em] text-mist">Cinéma &amp; restaurants</span>
    </span>
  );
}

function BookMenu({ onClose }) {
  const ref = useRef(null);
  useLayoutEffect(() => { const t = openSurface(ref.current); return () => t?.kill(); }, []);
  useEffect(() => {
    const onDoc = (e) => { if (!ref.current?.parentElement?.contains(e.target)) onClose(); };
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [onClose]);
  const item = 'flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ink-3';
  return (
    <div ref={ref} role="menu" className="absolute right-0 top-full mt-3 w-72 overflow-hidden rounded-[4px] border border-line bg-ink-2 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9)]">
      <Link role="menuitem" to="/cinema" onClick={onClose} className={item}><Clapperboard className="size-4 text-gold" /><span><span className="block text-sm font-semibold">Une séance</span><span className="text-xs text-mist">Choisir son siège dans la salle</span></span></Link>
      <Link role="menuitem" to="/restaurants" onClick={onClose} className={`${item} border-t border-line`}><UtensilsCrossed className="size-4 text-gold" /><span><span className="block text-sm font-semibold">Une table</span><span className="text-xs text-mist">Explorer le restaurant sur plan</span></span></Link>
      <Link role="menuitem" to="/reservation/retrouver" onClick={onClose} className={`${item} border-t border-line`}><Search className="size-4 text-mist" /><span className="text-sm">Retrouver une réservation</span></Link>
    </div>
  );
}

function MenuIcon() {
  return <svg viewBox="0 0 24 24" className="size-6" aria-hidden><path d="M3 7h18M3 12h12M3 17h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

export default function Navbar() {
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const [book, setBook] = useState(false);
  const bar = useRef(null);
  const panel = useRef(null);
  const loc = useLocation();

  useEffect(() => { setMenu(false); setBook(false); }, [loc.pathname]);

  // La barre prend un fond au scroll, se cache en descendant, revient en remontant.
  useLayoutEffect(() => {
    const el = bar.current;
    const ctx = gsap.context(() => {
      const hide = gsap.to(el, { yPercent: -110, duration: 0.45, ease: EASE.out, paused: true });
      ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: (self) => {
          el.dataset.scrolled = self.scroll() > 40 ? 'true' : 'false';
          if (prefersReducedMotion()) return;
          if (self.direction === 1 && self.scroll() > 400) hide.play(); else hide.reverse();
        },
      });
    });
    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    if (!menu || !panel.current) return undefined;
    document.body.style.overflow = 'hidden';
    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) return;
      gsap.timeline()
        .from(panel.current, { clipPath: 'inset(0 0 100% 0)', duration: 0.6, ease: EASE.inOut })
        .from(panel.current.querySelectorAll('[data-mi]'), { yPercent: 120, duration: 0.7, stagger: 0.05 }, 0.25);
    });
    return () => { ctx.revert(); document.body.style.overflow = ''; };
  }, [menu]);

  const linkCls = ({ isActive }) => `relative py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] transition-colors ${isActive ? 'text-paper' : 'text-mist hover:text-paper'} after:absolute after:inset-x-0 after:bottom-0.5 after:h-px after:origin-left after:bg-gold after:transition-transform after:duration-500 ${isActive ? 'after:scale-x-100' : 'after:scale-x-0 hover:after:scale-x-100'}`;
  const util = 'hidden items-center gap-1.5 whitespace-nowrap text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-mist transition-colors hover:text-paper sm:inline-flex';

  return (
    <>
      <header ref={bar} data-scrolled="false" className="fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-500 data-[scrolled=true]:border-b data-[scrolled=true]:border-line/80 data-[scrolled=true]:bg-ink/90 data-[scrolled=true]:backdrop-blur-md">
        <nav aria-label="Navigation principale" className="mx-auto grid h-[4.75rem] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-7">
            <button type="button" className="-ml-1 p-1 text-paper" aria-label="Ouvrir le menu" aria-expanded={menu} onClick={() => setMenu(true)}><MenuIcon /></button>
            <ul className="hidden items-center gap-7 lg:flex">
              {LINKS.slice(1, 3).map((l) => <li key={l.to}><NavLink to={l.to} end={l.end} className={linkCls}>{l.label}</NavLink></li>)}
            </ul>
          </div>
          <Link to="/" aria-label="MONARQUE, accueil"><Wordmark /></Link>
          <div className="flex items-center justify-end gap-6">
            {user ? (
              <>
                {isStaff(user) && <Link to="/admin" className={`${util} !hidden xl:!inline-flex`}><LayoutDashboard className="size-3.5" />Administration</Link>}
                <Link to="/compte" className={util} aria-label="Mon compte"><UserRound className="size-3.5" /><span className="hidden lg:inline">Mon compte</span></Link>
              </>
            ) : (
              <NavLink to="/connexion" className={util}><UserRound className="size-3.5" />Connexion</NavLink>
            )}
            <div className="relative">
              <button type="button" className={`${util} !inline-flex text-paper`} aria-haspopup="menu" aria-expanded={book} onClick={() => setBook((v) => !v)}><Ticket className="size-3.5" />Réserver</button>
              {book && <BookMenu onClose={() => setBook(false)} />}
            </div>
          </div>
        </nav>
      </header>

      {menu && (
        <div ref={panel} role="dialog" aria-modal="true" aria-label="Menu" className="velvet fixed inset-0 z-[60] flex flex-col px-6 pb-10 pt-5 sm:px-10">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <button type="button" className="justify-self-start p-1" aria-label="Fermer le menu" onClick={() => setMenu(false)}><X className="size-6" /></button>
            <Wordmark />
            <span />
          </div>
          <ul className="mx-auto mt-16 flex flex-col items-center gap-3">
            {LINKS.map((l) => (
              <li key={l.to} className="overflow-hidden">
                <NavLink data-mi to={l.to} end={l.end} className={({ isActive }) => `display block py-1 text-center text-6xl sm:text-7xl ${isActive ? 'italic text-gold' : 'hover:italic'}`}>{l.label}</NavLink>
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-auto flex w-full max-w-sm flex-col gap-3 overflow-hidden">
            <div data-mi className="flex flex-col gap-3">
              {user ? <Link to="/compte" className="btn btn-light">Mon compte</Link> : <Link to="/connexion" className="btn btn-light">Connexion</Link>}
              {user && isStaff(user) && <Link to="/admin" className="btn btn-ghost">Administration</Link>}
              <Link to="/reservation/retrouver" className="btn btn-ghost">Retrouver une réservation</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
