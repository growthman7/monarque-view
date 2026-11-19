import { minutesOf } from './format';

export const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export const rangesLabel = (ranges) => (ranges?.length ? ranges.map((r) => `${r.open.replace(':', ' h ')} – ${r.close.replace(':', ' h ')}`).join(' · ') : 'Fermé');

/** Horaires du jour et ouverture en cours (gère les fermetures après minuit). */
export function todayHours(restaurant, at = new Date()) {
  const ranges = restaurant.hours?.[at.getDay()] || [];
  const m = at.getHours() * 60 + at.getMinutes();
  const openNow = ranges.some((r) => {
    const o = minutesOf(r.open);
    let c = minutesOf(r.close);
    if (c <= o) c += 1440;
    return m >= o && m < c;
  });
  return { ranges, openNow, label: ranges.length ? `${openNow ? 'Ouvert · ' : ''}${rangesLabel(ranges)}` : 'Fermé aujourd’hui' };
}
