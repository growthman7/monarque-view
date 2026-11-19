const money = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** Montant en francs CFA (XOF) : « 6 000 FCFA » */
export const formatPrice = (amount) => `${money.format(Math.round(amount || 0))} FCFA`;

export const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
};

const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const longDateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export const formatDay = (d) => capitalize(dayFmt.format(new Date(d)));
export const formatShortDay = (d) => shortDayFmt.format(new Date(d));
export const formatTime = (d) => timeFmt.format(new Date(d));
export const formatDateTime = (d) => dateTimeFmt.format(new Date(d));
export const formatLongDate = (d) => longDateFmt.format(new Date(d));

export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Date locale au format YYYY-MM-DD (sans décalage UTC). */
export const toDateKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** « 19:30 » + « 2026-11-19 » → Date locale */
export const combineDateTime = (dateKey, time) => {
  const [y, mo, da] = dateKey.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, mo - 1, da, h, mi, 0, 0);
};

export const minutesOf = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
export const timeOf = (minutes) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
