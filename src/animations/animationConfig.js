import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { Observer } from 'gsap/Observer';
import { CustomEase } from 'gsap/CustomEase';

// GSAP ≥ 3.13 : tous les plugins (SplitText, Flip, Observer…) sont inclus et gratuits dans le paquet npm « gsap ».
gsap.registerPlugin(ScrollTrigger, SplitText, Flip, Observer, CustomEase);

/** Grammaire de mouvement MONARQUE : sortie exponentielle, jamais de rebond décoratif. */
CustomEase.create('monarque', '0.16, 1, 0.3, 1');
CustomEase.create('curtain', '0.76, 0, 0.24, 1');

export const EASE = { out: 'monarque', inOut: 'curtain', soft: 'power2.out' };
export const DUR = { micro: 0.18, short: 0.35, base: 0.6, long: 1.1, cinematic: 1.6 };
export const STAGGER = { chars: 0.025, words: 0.04, items: 0.06 };

gsap.defaults({ ease: EASE.out, duration: DUR.base });
ScrollTrigger.config({ ignoreMobileResize: true });

const MOTION_KEY = 'monarque.motion';
/** Choix explicite du visiteur sur ce site ('on' | 'off'), sinon null = suivre le réglage du système. */
export const motionChoice = () => { try { return localStorage.getItem(MOTION_KEY); } catch { return null; } };
export const setMotionChoice = (v) => {
  try { if (v) localStorage.setItem(MOTION_KEY, v); else localStorage.removeItem(MOTION_KEY); } catch { /* stockage indisponible */ }
  window.location.reload(); // les timelines sont construites au montage : un rechargement est le plus sûr
};
export const systemReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const prefersReducedMotion = () => {
  const c = motionChoice();
  return c === 'on' ? false : c === 'off' ? true : systemReducedMotion();
};

/** Petits écrans / appareils modestes : animations allégées. */
export const isLowPower = () =>
  typeof navigator !== 'undefined' && ((navigator.hardwareConcurrency || 8) <= 4 || window.innerWidth < 640);

export { gsap, ScrollTrigger, SplitText, Flip, Observer };
