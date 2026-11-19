import { useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { Logo } from '../common';
import { DEMO_MODE } from '../../services/api/client';
import { revealPage } from '../../animations/pageTransitions';
import { ScrollTrigger, gsap } from '../../animations/animationConfig';

/**
 * Transition entre pages : le rideau couvre l'écran au moment même du changement de route
 * (avant le premier rendu peint), puis se lève sur la nouvelle page. Aucune attente imposée.
 */
export function PageTransition({ children }) {
  const loc = useLocation();
  const curtain = useRef(null);
  const page = useRef(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (first.current) { first.current = false; return undefined; }
    // gsap.context + revert : si la route change pendant la transition, tout revient à l'état neutre.
    const ctx = gsap.context(() => {
      gsap.set(curtain.current, { display: 'flex', yPercent: 0 });
      revealPage(curtain.current, page.current);
    });
    const t = setTimeout(() => ScrollTrigger.refresh(), 700);
    return () => { ctx.revert(); clearTimeout(t); };
  }, [loc.pathname]);
  return (
    <>
      <div ref={curtain} aria-hidden className="velvet pointer-events-none fixed inset-0 z-[65] hidden items-center justify-center"><Logo className="text-paper" /></div>
      <div ref={page}>{children}</div>
    </>
  );
}

export function DemoBanner() {
  if (!DEMO_MODE) return null;
  return (
    <div role="note" className="fixed bottom-3 left-3 z-30 max-w-[calc(100vw-1.5rem)] rounded-full border border-warn/30 bg-[#1a1408]/95 px-3 py-1.5 text-[0.6875rem] font-medium text-warn shadow-lg backdrop-blur">
      <span className="font-bold">Démo</span><span className="hidden sm:inline"> · données fictives, paiements simulés, aucun débit réel</span>
    </div>
  );
}

export function PublicLayout() {
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-paper focus:px-4 focus:py-2 focus:text-ink">Aller au contenu</a>
      <DemoBanner />
      <Navbar />
      <PageTransition>
        <main id="contenu" className="min-h-[70vh]"><Outlet /></main>
        <Footer />
      </PageTransition>
    </>
  );
}

/** Mise en page des parcours de réservation : pas de pied de page, l'attention reste sur le choix. */
export function FlowLayout() {
  return (
    <>
      <DemoBanner />
      <Navbar />
      <PageTransition>
        <main id="contenu" className="min-h-[100dvh] pt-[4.5rem]"><Outlet /></main>
      </PageTransition>
    </>
  );
}
