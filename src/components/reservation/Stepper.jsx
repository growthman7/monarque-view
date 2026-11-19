import { Check } from 'lucide-react';

export default function Stepper({ steps, current }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto text-xs sm:text-sm" aria-label="Étapes de la réservation">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex shrink-0 items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span className={`grid size-6 place-items-center rounded-full text-[0.6875rem] font-bold transition-colors duration-500 ${done ? 'bg-violet text-paper' : active ? 'bg-paper text-ink' : 'border border-line text-mist'}`}>
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={active ? 'font-semibold text-paper' : 'text-mist'}>{s}</span>
            {i < steps.length - 1 && <span className={`mx-1 h-px w-6 sm:w-10 ${done ? 'bg-violet' : 'bg-line'}`} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export const CINEMA_STEPS = ['Séance', 'Sièges', 'Coordonnées & paiement', 'Billet'];
export const RESTAURANT_STEPS = ['Créneau', 'Table', 'Coordonnées', 'Confirmation'];
