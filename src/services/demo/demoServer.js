/**
 * SERVEUR DE DÉMONSTRATION (navigateur).
 *
 * Il reproduit le contrat REST attendu du vrai backend MONARQUE afin que le frontend soit
 * branché dès aujourd'hui. Il applique les mêmes règles métier que le serveur réel devra appliquer :
 *  - verrouillage temporaire des sièges/tables (réservation « pending_payment » avec expiration),
 *  - contrôle de conflit et écriture dans la même opération synchrone (équivalent d'une transaction),
 *  - transitions de statut contrôlées, permissions vérifiées à chaque appel,
 *  - idempotence des initialisations de paiement.
 *
 * Limites assumées : les données vivent dans le navigateur (localStorage) ; deux navigateurs
 * différents ne partagent pas les verrous. En production, ces règles s'exécutent côté serveur
 * avec une contrainte d'unicité (session_id, seat_id) en base et une transaction SQL.
 */
import { buildSeed, hashPassword } from './seed';
import { can, canEditPlanKind, isStaff } from '../../utils/permissions';
import { assignZones, validatePlan } from '../../utils/planGenerators';
import { reservationRef, uid } from '../../utils/ids';
import { combineDateTime, minutesOf, timeOf, toDateKey } from '../../utils/format';

const KEY = 'monarque.demo.db.v2';
const TOKEN_KEY = 'monarque.demo.token';
export const HOLD_MINUTES = 8;
const CAT_LABEL = { standard: 'Standard', premium: 'Premium', vip: 'VIP' };
const MAX_SEATS = 8;

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let db = null;
let ready = null;
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('monarque') : null;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function save(scope = 'all') {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Stockage de démonstration plein', e);
    throw new ApiError(507, 'storage_full', "Le stockage de démonstration du navigateur est plein. Réinitialisez les données depuis l'administration.");
  }
  channel?.postMessage({ type: 'db-change', scope });
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      db = load();
      channel?.postMessage({ type: 'db-change', scope: 'external' });
      window.dispatchEvent(new CustomEvent('monarque:db-change', { detail: { scope: 'external' } }));
    }
  });
  channel?.addEventListener('message', (e) => {
    if (e.data?.type === 'db-change') {
      db = load();
      window.dispatchEvent(new CustomEvent('monarque:db-change', { detail: e.data }));
    }
  });
}

export function init() {
  if (!ready) {
    ready = (async () => {
      db = load();
      if (!db) {
        db = await buildSeed();
        save('seed');
      }
    })();
  }
  return ready;
}

export async function resetDemo() {
  db = await buildSeed();
  save('seed');
}

/* ───────────── Aides ───────────── */
const now = () => new Date();
const iso = () => new Date().toISOString();
const notFound = (what) => new ApiError(404, 'not_found', `${what} introuvable.`);
const publicUser = (u) => u && { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, createdAt: u.createdAt };

function currentUser(token) {
  if (!token) return null;
  const s = db.sessionsAuth[token];
  if (!s) return null;
  return db.users.find((u) => u.id === s.userId) || null;
}
function requirePerm(user, perm) {
  if (!user) throw new ApiError(401, 'unauthenticated', 'Connectez-vous pour continuer.');
  if (!can(user, perm)) throw new ApiError(403, 'forbidden', "Votre rôle ne permet pas cette action.");
}
function log(type, text) {
  db.activity.unshift({ id: uid('act'), at: iso(), type, text });
  db.activity = db.activity.slice(0, 200);
}

/** Expire les verrous abandonnés : appelé avant chaque requête (en production : tâche planifiée + contrôle à la lecture). */
function sweep() {
  let changed = false;
  const t = now().getTime();
  for (const r of db.reservations) {
    if (r.status === 'pending_payment' && r.expiresAt && new Date(r.expiresAt).getTime() < t) {
      transition(r, 'expired', 'système');
      for (const tx of db.transactions) if (tx.reservationId === r.id && tx.status === 'pending') setTx(tx, 'expired');
      changed = true;
    }
    if (r.status === 'confirmed' && endOf(r) < t) {
      transition(r, 'completed', 'système');
      changed = true;
    }
  }
  if (changed) save('sweep');
}

function endOf(r) {
  if (r.kind === 'cinema') {
    const s = db.sessions.find((x) => x.id === r.cinema.sessionId);
    const f = s && db.films.find((x) => x.id === s.filmId);
    return s ? new Date(s.startsAt).getTime() + (f?.duration || 120) * 60e3 : Infinity;
  }
  return combineDateTime(r.restaurant.date, r.restaurant.time).getTime() + r.restaurant.duration * 60e3;
}

const TRANSITIONS = {
  pending_payment: ['confirmed', 'cancelled', 'expired'],
  confirmed: ['completed', 'cancelled', 'refunding'],
  refunding: ['cancelled'],
  cancelled: [], expired: [], completed: [],
};
function transition(r, to, by) {
  if (!TRANSITIONS[r.status]?.includes(to)) {
    throw new ApiError(409, 'invalid_transition', `Impossible de passer de « ${r.status} » à « ${to} ».`);
  }
  r.status = to;
  r.history.push({ status: to, at: iso(), by });
  if (to !== 'pending_payment') r.expiresAt = null;
}
function setTx(tx, status) {
  tx.status = status;
  tx.updatedAt = iso();
  tx.events.push({ status, at: tx.updatedAt });
}

/** Une réservation « tient » une place si elle est confirmée, ou en attente et non expirée. */
const holds = (r) => r.status === 'confirmed' || r.status === 'refunding' || (r.status === 'pending_payment' && new Date(r.expiresAt) > now());

function seatState(sessionId, excludeReservationId) {
  const occupied = new Set();
  const locked = new Set();
  for (const r of db.reservations) {
    if (r.kind !== 'cinema' || r.cinema.sessionId !== sessionId || r.id === excludeReservationId || !holds(r)) continue;
    for (const id of r.cinema.seatIds) (r.status === 'pending_payment' ? locked : occupied).add(id);
  }
  return { occupied, locked };
}

function planOf(id, which = 'published') {
  const p = db.plans.find((x) => x.id === id);
  if (!p) throw notFound('Plan');
  return { id: p.id, kind: p.kind, ownerId: p.ownerId, name: p.name, ...p[which], publishedVersion: p.publishedVersion };
}

function openRanges(restaurant, dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  if (restaurant.closures?.some((c) => dateKey >= c.from && dateKey <= (c.to || c.from))) return [];
  return restaurant.hours[d.getDay()] || [];
}

/** Créneaux réservables : chaque plage d'ouverture, pas de 30 min, en laissant le temps du repas avant la fermeture. */
function slotsFor(restaurant, dateKey) {
  const slots = [];
  const nowT = now();
  for (const range of openRanges(restaurant, dateKey)) {
    let start = minutesOf(range.open);
    let end = minutesOf(range.close);
    if (end <= start) end += 24 * 60;
    const lastSeating = end - Math.min(restaurant.duration, 90);
    for (let m = start; m <= lastSeating; m += 30) {
      const t = timeOf(m);
      if (combineDateTime(dateKey, t) > new Date(nowT.getTime() + 30 * 60e3)) slots.push(t);
    }
  }
  return slots;
}

function tableStates(restaurant, plan, dateKey, time, party, excludeReservationId) {
  const start = combineDateTime(dateKey, time).getTime();
  const end = start + restaurant.duration * 60e3;
  const states = {};
  const busy = new Map();
  for (const r of db.reservations) {
    if (r.kind !== 'restaurant' || r.restaurant.restaurantId !== restaurant.id || r.id === excludeReservationId || !holds(r)) continue;
    const rs = combineDateTime(r.restaurant.date, r.restaurant.time).getTime();
    const re = rs + r.restaurant.duration * 60e3;
    if (rs < end && start < re) busy.set(r.restaurant.tableId, r.status === 'pending_payment' ? 'locked' : 'occupied');
  }
  for (const t of plan.elements.filter((x) => x.type === 'table')) {
    if (t.status === 'disabled') states[t.id] = 'disabled';
    else if (busy.has(t.id)) states[t.id] = busy.get(t.id);
    else if (party > t.capacity) states[t.id] = 'too_small';
    else if (party < (t.properties.minParty || 1)) states[t.id] = 'min_party';
    else states[t.id] = 'available';
  }
  return states;
}

function reservationView(r, includeToken = false) {
  const out = structuredClone(r);
  if (!includeToken) delete out.accessToken;
  if (r.kind === 'cinema') {
    const s = db.sessions.find((x) => x.id === r.cinema.sessionId);
    const f = s && db.films.find((x) => x.id === s.filmId);
    const h = s && db.halls.find((x) => x.id === s.hallId);
    out.summary = { title: f?.title, filmId: f?.id, hall: h?.name, startsAt: s?.startsAt, format: s?.format, language: s?.language, poster: f?.poster, duration: f?.duration };
  } else {
    const rest = db.restaurants.find((x) => x.id === r.restaurant.restaurantId);
    out.summary = { title: rest?.name, restaurantId: rest?.id, address: rest?.address, startsAt: combineDateTime(r.restaurant.date, r.restaurant.time).toISOString(), photo: rest?.photos?.[0] };
  }
  out.transactions = db.transactions.filter((t) => t.reservationId === r.id).map((t) => ({ ...t }));
  return out;
}

function canAccessReservation(r, user, accessToken) {
  if (user && (r.userId === user.id || can(user, 'reservations:view'))) return true;
  return !!accessToken && accessToken === r.accessToken;
}

function cancellationPolicy(r) {
  const start = r.kind === 'cinema'
    ? new Date(db.sessions.find((x) => x.id === r.cinema.sessionId)?.startsAt).getTime()
    : combineDateTime(r.restaurant.date, r.restaurant.time).getTime();
  const limitHours = r.kind === 'cinema' ? 2 : 3;
  return { allowed: start - now().getTime() > limitHours * 3600e3, limitHours };
}

function computeStats() {
  const todayKey = toDateKey(now());
  const days = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(toDateKey(d));
  }
  const paidTx = db.transactions.filter((t) => t.status === 'succeeded');
  const revenueByDay = days.map((k) => ({
    day: k,
    cinema: paidTx.filter((t) => t.createdAt.startsWith(k) && db.reservations.find((r) => r.id === t.reservationId)?.kind === 'cinema').reduce((s, t) => s + t.amount, 0),
    restaurant: paidTx.filter((t) => t.createdAt.startsWith(k) && db.reservations.find((r) => r.id === t.reservationId)?.kind === 'restaurant').reduce((s, t) => s + t.amount, 0),
  }));
  const active = db.reservations.filter((r) => ['confirmed', 'completed', 'pending_payment'].includes(r.status));
  const hallOcc = db.halls.map((h) => {
    const plan = planOf(h.planId);
    const seats = plan.elements.filter((x) => x.type === 'seat' && x.status === 'active').length;
    const sessions = db.sessions.filter((s) => s.hallId === h.id && toDateKey(s.startsAt) >= days[7] && toDateKey(s.startsAt) <= todayKey);
    const sold = sessions.reduce((sum, s) => sum + seatState(s.id).occupied.size, 0);
    return { id: h.id, name: h.name, rate: sessions.length ? sold / (sessions.length * seats) : 0 };
  });
  const restOcc = db.restaurants.map((r) => {
    const plan = planOf(r.planId);
    const tables = plan.elements.filter((x) => x.type === 'table').length;
    let services = 0;
    for (const k of days.slice(7)) services += openRanges(r, k).length;
    const booked = db.reservations.filter((x) => x.kind === 'restaurant' && x.restaurant.restaurantId === r.id && x.restaurant.date >= days[7] && x.restaurant.date <= todayKey && ['confirmed', 'completed'].includes(x.status)).length;
    return { id: r.id, name: r.name, rate: services ? Math.min(1, booked / (services * tables)) : 0 };
  });
  return {
    totals: {
      reservations: active.length,
      today: db.reservations.filter((r) => r.createdAt.startsWith(todayKey)).length,
      cinema: active.filter((r) => r.kind === 'cinema').length,
      restaurant: active.filter((r) => r.kind === 'restaurant').length,
      revenue: paidTx.reduce((s, t) => s + t.amount, 0),
      txSucceeded: paidTx.length,
      txPending: db.transactions.filter((t) => t.status === 'pending').length,
      txFailed: db.transactions.filter((t) => ['failed', 'cancelled', 'expired'].includes(t.status)).length,
    },
    revenueByDay, hallOcc, restOcc,
    activity: db.activity.slice(0, 15),
  };
}

/* ───────────── Routeur ───────────── */
const routes = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  routes.push({ method, re, keys, handler });
};

/* Auth */
route('POST', '/auth/register', async ({ body }) => {
  const email = String(body.email || '').trim().toLowerCase();
  if (db.users.some((u) => u.email === email)) throw new ApiError(409, 'email_taken', 'Un compte existe déjà avec cette adresse.');
  const user = { id: uid('u'), name: body.name.trim(), email, phone: body.phone || '', role: 'customer', passwordHash: await hashPassword(body.password), createdAt: iso() };
  db.users.push(user);
  const token = uid('tok');
  db.sessionsAuth[token] = { userId: user.id, at: iso() };
  log('user.registered', `Nouveau compte client : ${user.name}`);
  save('users');
  return { token, user: publicUser(user) };
});
route('POST', '/auth/login', async ({ body }) => {
  const user = db.users.find((u) => u.email === String(body.email || '').trim().toLowerCase());
  if (!user || user.passwordHash !== (await hashPassword(body.password || ''))) throw new ApiError(401, 'bad_credentials', 'E-mail ou mot de passe incorrect.');
  const token = uid('tok');
  db.sessionsAuth[token] = { userId: user.id, at: iso() };
  save('auth');
  return { token, user: publicUser(user) };
});
route('POST', '/auth/demo-login', async ({ body }) => {
  const user = db.users.find((u) => u.email === body.email && u.email.endsWith('@monarque.demo'));
  if (!user) throw notFound('Compte de démonstration');
  const token = uid('tok');
  db.sessionsAuth[token] = { userId: user.id, at: iso() };
  save('auth');
  return { token, user: publicUser(user) };
});
route('POST', '/auth/logout', ({ token }) => {
  delete db.sessionsAuth[token];
  save('auth');
  return { ok: true };
});
route('GET', '/auth/me', ({ user }) => {
  if (!user) throw new ApiError(401, 'unauthenticated', 'Session expirée.');
  return publicUser(user);
});
route('PATCH', '/auth/me', ({ user, body }) => {
  if (!user) throw new ApiError(401, 'unauthenticated', 'Session expirée.');
  if (body.name) user.name = body.name.trim();
  if (body.phone !== undefined) user.phone = body.phone;
  save('users');
  return publicUser(user);
});

/* Films & séances */
route('GET', '/films', () => db.films);
route('GET', '/films/:id', ({ params }) => db.films.find((f) => f.id === params.id) || (() => { throw notFound('Film'); })());
route('POST', '/films', ({ user, body }) => {
  requirePerm(user, 'films:manage');
  const film = { id: uid('f'), posterUrl: '', trailerUrl: '', cast: [], genres: [], poster: { bg: '#1f0a33', ink: '#F8F6FA', accent: '#A855F7', motif: 'sun' }, ...body };
  db.films.push(film);
  log('film.created', `Film ajouté : ${film.title}`);
  save('films');
  return film;
});
route('PUT', '/films/:id', ({ user, body, params }) => {
  requirePerm(user, 'films:manage');
  const f = db.films.find((x) => x.id === params.id);
  if (!f) throw notFound('Film');
  Object.assign(f, body, { id: f.id });
  save('films');
  return f;
});
route('DELETE', '/films/:id', ({ user, params }) => {
  requirePerm(user, 'films:manage');
  const sessions = db.sessions.filter((s) => s.filmId === params.id).map((s) => s.id);
  if (db.reservations.some((r) => r.kind === 'cinema' && sessions.includes(r.cinema.sessionId) && holds(r))) throw new ApiError(409, 'has_reservations', 'Ce film a des réservations actives : retirez-le plutôt de l’affiche.');
  db.films = db.films.filter((f) => f.id !== params.id);
  db.sessions = db.sessions.filter((s) => s.filmId !== params.id);
  save('films');
  return { ok: true };
});
route('GET', '/sessions', ({ query }) => {
  let list = db.sessions;
  if (query.filmId) list = list.filter((s) => s.filmId === query.filmId);
  if (query.from) list = list.filter((s) => s.startsAt >= query.from);
  if (query.to) list = list.filter((s) => s.startsAt <= query.to);
  return list
    .map((s) => {
      const { occupied, locked } = seatState(s.id);
      const plan = planOf(db.halls.find((h) => h.id === s.hallId).planId);
      const total = plan.elements.filter((x) => x.type === 'seat' && x.status === 'active').length;
      return { ...s, hall: db.halls.find((h) => h.id === s.hallId)?.name, remaining: total - occupied.size - locked.size, capacity: total };
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
});
route('GET', '/sessions/:id', ({ params }) => {
  const s = db.sessions.find((x) => x.id === params.id);
  if (!s) throw notFound('Séance');
  const hall = db.halls.find((h) => h.id === s.hallId);
  return { ...s, film: db.films.find((f) => f.id === s.filmId), hall, plan: planOf(hall.planId) };
});
route('GET', '/sessions/:id/seats', ({ params, query }) => {
  const { occupied, locked } = seatState(params.id, query.exclude);
  return { occupied: [...occupied], locked: [...locked], at: iso() };
});
route('POST', '/sessions', ({ user, body }) => {
  requirePerm(user, 'sessions:manage');
  const hall = db.halls.find((h) => h.id === body.hallId);
  const film = db.films.find((f) => f.id === body.filmId);
  if (!hall || !film) throw new ApiError(422, 'invalid', 'Film ou salle invalide.');
  const start = combineDateTime(body.date, body.time);
  const end = start.getTime() + (film.duration + 20) * 60e3;
  const clash = db.sessions.find((s) => {
    if (s.hallId !== hall.id) return false;
    const sf = db.films.find((f) => f.id === s.filmId);
    const ss = new Date(s.startsAt).getTime();
    return ss < end && start.getTime() < ss + ((sf?.duration || 120) + 20) * 60e3;
  });
  if (clash) throw new ApiError(409, 'hall_busy', `La salle est déjà occupée à ce moment (séance de ${new Date(clash.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}).`);
  const s = { id: uid('s'), filmId: film.id, hallId: hall.id, startsAt: start.toISOString(), format: body.format || '2D', language: body.language || 'VF', prices: body.prices || { ...hall.prices } };
  db.sessions.push(s);
  log('session.created', `Séance programmée : ${film.title}, ${hall.name}`);
  save('sessions');
  return s;
});
route('DELETE', '/sessions/:id', ({ user, params }) => {
  requirePerm(user, 'sessions:manage');
  if (db.reservations.some((r) => r.kind === 'cinema' && r.cinema.sessionId === params.id && holds(r))) throw new ApiError(409, 'has_reservations', 'Cette séance a des réservations actives.');
  db.sessions = db.sessions.filter((s) => s.id !== params.id);
  save('sessions');
  return { ok: true };
});

/* Salles */
route('GET', '/halls', () => db.halls.map((h) => {
  const p = db.plans.find((x) => x.id === h.planId);
  return { ...h, seats: p.published.elements.filter((x) => x.type === 'seat').length, publishedVersion: p.publishedVersion };
}));
route('POST', '/halls', ({ user, body }) => {
  requirePerm(user, 'halls:manage');
  const id = uid('h');
  const planId = uid('p');
  const snapshot = { width: Number(body.width) || 1000, height: Number(body.height) || 700, gridSize: 10, elements: [] };
  db.plans.push({ id: planId, kind: 'cinema', ownerId: id, name: body.name, draft: snapshot, published: { ...snapshot, elements: [] }, publishedVersion: 0, versions: [], updatedAt: iso() });
  const hall = { id, name: body.name, planId, prices: body.prices || { standard: 4000, premium: 6000, vip: 10000 }, formats: ['2D'], venue: 'MONARQUE Plateau' };
  db.halls.push(hall);
  log('hall.created', `Salle créée : ${hall.name}`);
  save('halls');
  return hall;
});
route('PUT', '/halls/:id', ({ user, body, params }) => {
  requirePerm(user, 'halls:manage');
  const h = db.halls.find((x) => x.id === params.id);
  if (!h) throw notFound('Salle');
  Object.assign(h, { name: body.name ?? h.name, prices: body.prices ?? h.prices, formats: body.formats ?? h.formats });
  const p = db.plans.find((x) => x.id === h.planId);
  if (p && body.name) p.name = body.name;
  save('halls');
  return h;
});

/* Restaurants */
route('GET', '/restaurants', () => db.restaurants.map((r) => {
  const p = planOf(r.planId);
  const tables = p.elements.filter((x) => x.type === 'table');
  return { ...r, tableCount: tables.length, seatCount: tables.reduce((s, t) => s + t.capacity, 0) };
}));
route('GET', '/restaurants/:id', ({ params }) => {
  const r = db.restaurants.find((x) => x.id === params.id);
  if (!r) throw notFound('Restaurant');
  return { ...r, plan: planOf(r.planId) };
});
route('POST', '/restaurants', ({ user, body }) => {
  requirePerm(user, 'restaurants:manage');
  const id = uid('r');
  const planId = uid('p');
  const snapshot = { width: 1200, height: 800, gridSize: 10, elements: [] };
  db.plans.push({ id: planId, kind: 'restaurant', ownerId: id, name: body.name, draft: snapshot, published: { ...snapshot, elements: [] }, publishedVersion: 0, versions: [], updatedAt: iso() });
  const r = { id, planId, photos: [], hours: [0, 1, 2, 3, 4, 5, 6].map(() => [{ open: '19:00', close: '23:00' }]), duration: 120, closures: [], priceRange: 2, conditions: '', ...body };
  db.restaurants.push(r);
  log('restaurant.created', `Restaurant créé : ${r.name}`);
  save('restaurants');
  return r;
});
route('PUT', '/restaurants/:id', ({ user, body, params }) => {
  requirePerm(user, 'restaurants:manage');
  const r = db.restaurants.find((x) => x.id === params.id);
  if (!r) throw notFound('Restaurant');
  Object.assign(r, body, { id: r.id, planId: r.planId });
  save('restaurants');
  return r;
});
route('DELETE', '/restaurants/:id', ({ user, params }) => {
  requirePerm(user, 'restaurants:manage');
  if (db.reservations.some((x) => x.kind === 'restaurant' && x.restaurant.restaurantId === params.id && holds(x))) throw new ApiError(409, 'has_reservations', 'Ce restaurant a des réservations actives.');
  const r = db.restaurants.find((x) => x.id === params.id);
  db.restaurants = db.restaurants.filter((x) => x.id !== params.id);
  db.plans = db.plans.filter((p) => p.id !== r?.planId);
  save('restaurants');
  return { ok: true };
});
route('GET', '/restaurants/:id/availability', ({ params, query }) => {
  const r = db.restaurants.find((x) => x.id === params.id);
  if (!r) throw notFound('Restaurant');
  const party = Math.max(1, Number(query.party) || 2);
  const slots = slotsFor(r, query.date);
  if (!slots.length) return { open: false, reason: openRanges(r, query.date).length ? 'Plus aucun créneau ce jour-là.' : 'Fermé ce jour-là.', slots, tables: {} };
  const time = slots.includes(query.time) ? query.time : slots[0];
  const plan = planOf(r.planId);
  return { open: true, slots, time, tables: tableStates(r, plan, query.date, time, party, query.exclude) };
});

/* Plans */
route('GET', '/plans/:id', ({ user, params, query }) => {
  if (query.draft) {
    const p = db.plans.find((x) => x.id === params.id);
    if (!p) throw notFound('Plan');
    if (!canEditPlanKind(user, p.kind)) throw new ApiError(403, 'forbidden', 'Accès à l’éditeur refusé.');
    return { ...planOf(params.id, 'draft'), versions: p.versions.map(({ snapshot, ...v }) => v), updatedAt: p.updatedAt };
  }
  return planOf(params.id);
});
route('PUT', '/plans/:id/draft', ({ user, params, body }) => {
  const p = db.plans.find((x) => x.id === params.id);
  if (!p) throw notFound('Plan');
  if (!canEditPlanKind(user, p.kind)) throw new ApiError(403, 'forbidden', 'Vous ne pouvez pas modifier ce plan.');
  const snapshot = { width: body.width, height: body.height, gridSize: body.gridSize || 10, elements: p.kind === 'restaurant' ? assignZones(body.elements) : body.elements };
  if (body.name) p.name = body.name;
  p.draft = snapshot;
  const version = (p.versions.at(-1)?.version || 0) + 1;
  p.versions.push({ version, status: 'draft', savedAt: iso(), savedBy: user.name, note: body.note || 'Brouillon enregistré', snapshot: structuredClone(snapshot) });
  p.versions = p.versions.slice(-30);
  p.updatedAt = iso();
  save('plans');
  return { ok: true, version, savedAt: p.updatedAt };
});
route('POST', '/plans/:id/publish', ({ user, params }) => {
  requirePerm(user, 'plans:publish');
  const p = db.plans.find((x) => x.id === params.id);
  if (!p) throw notFound('Plan');
  if (!canEditPlanKind(user, p.kind)) throw new ApiError(403, 'forbidden', 'Vous ne pouvez pas publier ce plan.');
  const check = validatePlan({ ...p.draft, kind: p.kind });
  if (check.errors.length) throw new ApiError(422, 'invalid_plan', 'Le plan contient des erreurs.', check);
  // Un siège/une table supprimé(e) ne doit pas faire disparaître une réservation active.
  const ids = new Set(p.draft.elements.map((x) => x.id));
  const orphan = db.reservations.filter((r) => holds(r) && new Date(endOf(r)) > now() && (
    (r.kind === 'cinema' && db.sessions.find((s) => s.id === r.cinema.sessionId)?.hallId === p.ownerId && r.cinema.seatIds.some((id) => !ids.has(id))) ||
    (r.kind === 'restaurant' && r.restaurant.restaurantId === p.ownerId && !ids.has(r.restaurant.tableId))));
  if (orphan.length) throw new ApiError(409, 'orphan_reservations', `${orphan.length} réservation(s) à venir utilisent des places supprimées du plan. Désactivez ces places au lieu de les supprimer.`, { refs: orphan.map((r) => r.ref) });
  p.published = structuredClone(p.draft);
  const version = (p.versions.at(-1)?.version || 0) + 1;
  p.versions.forEach((v) => { if (v.status === 'published') v.status = 'archived'; });
  p.versions.push({ version, status: 'published', savedAt: iso(), savedBy: user.name, note: 'Publication', snapshot: structuredClone(p.draft) });
  p.publishedVersion = version;
  p.updatedAt = iso();
  log('plan.published', `Plan publié : ${p.name} (v${version})`);
  save('plans');
  return { ok: true, version, warnings: check.warnings };
});
route('POST', '/plans/:id/restore/:version', ({ user, params }) => {
  const p = db.plans.find((x) => x.id === params.id);
  if (!p) throw notFound('Plan');
  if (!canEditPlanKind(user, p.kind)) throw new ApiError(403, 'forbidden', 'Accès refusé.');
  const v = p.versions.find((x) => String(x.version) === params.version);
  if (!v) throw notFound('Version');
  p.draft = structuredClone(v.snapshot);
  save('plans');
  return { ...planOf(p.id, 'draft') };
});

/* Réservations */
route('POST', '/reservations', ({ user, body }) => {
  const accessToken = uid('acc');
  const base = {
    id: uid('res'), ref: reservationRef(), status: 'pending_payment', userId: user?.id || null,
    customer: user ? { name: user.name, email: user.email, phone: user.phone } : null,
    currency: 'XOF', createdAt: iso(), expiresAt: new Date(Date.now() + HOLD_MINUTES * 60e3).toISOString(),
    history: [{ status: 'pending_payment', at: iso(), by: user ? user.name : 'invité' }], accessToken,
  };
  if (body.kind === 'cinema') {
    const s = db.sessions.find((x) => x.id === body.sessionId);
    if (!s) throw notFound('Séance');
    if (new Date(s.startsAt) < now()) throw new ApiError(409, 'past', 'Cette séance a déjà commencé.');
    const seatIds = [...new Set(body.seatIds || [])];
    if (!seatIds.length) throw new ApiError(422, 'empty', 'Choisissez au moins un siège.');
    if (seatIds.length > MAX_SEATS) throw new ApiError(422, 'too_many', `${MAX_SEATS} sièges maximum par réservation.`);
    const plan = planOf(db.halls.find((h) => h.id === s.hallId).planId);
    const seats = seatIds.map((id) => plan.elements.find((x) => x.id === id && x.type === 'seat'));
    if (seats.some((x) => !x || x.status !== 'active')) throw new ApiError(422, 'invalid_seat', 'Un des sièges choisis n’est pas réservable.');
    // Contrôle + écriture dans la même opération : aucun autre client ne peut s'intercaler.
    const { occupied, locked } = seatState(s.id);
    const taken = seats.filter((x) => occupied.has(x.id) || locked.has(x.id));
    if (taken.length) throw new ApiError(409, 'seat_taken', `Le siège ${taken.map((t) => t.label).join(', ')} vient d’être pris par un autre client.`, { seatIds: taken.map((t) => t.id) });
    const lines = seats.map((x) => ({ label: `Siège ${x.label} · ${CAT_LABEL[x.category] || x.category}`, amount: s.prices[x.category] }));
    const r = { ...base, kind: 'cinema', paymentRequired: true, amount: lines.reduce((a, l) => a + l.amount, 0), lines, cinema: { sessionId: s.id, seatIds, seatLabels: seats.map((x) => x.label) }, restaurant: null };
    db.reservations.unshift(r);
    save('reservations');
    return reservationView(r, true);
  }
  if (body.kind === 'restaurant') {
    const rest = db.restaurants.find((x) => x.id === body.restaurantId);
    if (!rest) throw notFound('Restaurant');
    const party = Number(body.party);
    if (!slotsFor(rest, body.date).includes(body.time)) throw new ApiError(422, 'closed', 'Ce créneau n’est pas disponible.');
    const plan = planOf(rest.planId);
    const t = plan.elements.find((x) => x.id === body.tableId && x.type === 'table');
    if (!t) throw notFound('Table');
    const state = tableStates(rest, plan, body.date, body.time, party)[t.id];
    if (state !== 'available') {
      const msg = { occupied: 'Cette table vient d’être réservée.', locked: 'Un autre client est en train de réserver cette table.', too_small: 'Cette table est trop petite pour votre groupe.', min_party: `Cette table demande au moins ${t.properties.minParty} convives.`, disabled: 'Cette table n’est pas réservable.' }[state];
      throw new ApiError(409, 'table_unavailable', msg);
    }
    const deposit = t.properties.deposit || 0;
    const r = { ...base, kind: 'restaurant', paymentRequired: deposit > 0, amount: deposit, lines: deposit ? [{ label: `Acompte table ${t.label}`, amount: deposit }] : [], cinema: null, restaurant: { restaurantId: rest.id, tableId: t.id, tableLabel: t.label, date: body.date, time: body.time, party, duration: rest.duration, zone: plan.elements.find((z) => z.id === t.properties.zoneId)?.label || null } };
    db.reservations.unshift(r);
    save('reservations');
    return reservationView(r, true);
  }
  throw new ApiError(422, 'invalid', 'Type de réservation inconnu.');
});
route('GET', '/reservations/:id', ({ user, params, accessToken }) => {
  const r = db.reservations.find((x) => x.id === params.id);
  if (!r) throw notFound('Réservation');
  if (!canAccessReservation(r, user, accessToken)) throw new ApiError(403, 'forbidden', 'Cette réservation ne vous appartient pas.');
  return { ...reservationView(r), cancellation: cancellationPolicy(r) };
});
route('PATCH', '/reservations/:id/customer', ({ user, params, body, accessToken }) => {
  const r = db.reservations.find((x) => x.id === params.id);
  if (!r) throw notFound('Réservation');
  if (!canAccessReservation(r, user, accessToken)) throw new ApiError(403, 'forbidden', 'Accès refusé.');
  if (r.status !== 'pending_payment') throw new ApiError(409, 'locked', 'Cette réservation ne peut plus être modifiée.');
  r.customer = { name: body.name.trim(), email: body.email.trim().toLowerCase(), phone: body.phone.trim() };
  save('reservations');
  return reservationView(r);
});
route('POST', '/reservations/:id/confirm', ({ user, params, accessToken }) => {
  const r = db.reservations.find((x) => x.id === params.id);
  if (!r) throw notFound('Réservation');
  if (!canAccessReservation(r, user, accessToken)) throw new ApiError(403, 'forbidden', 'Accès refusé.');
  if (r.paymentRequired) throw new ApiError(402, 'payment_required', 'Cette réservation doit être payée pour être confirmée.');
  if (!r.customer) throw new ApiError(422, 'customer_missing', 'Coordonnées manquantes.');
  if (r.status === 'confirmed') return reservationView(r);
  transition(r, 'confirmed', 'système');
  notify(r);
  save('reservations');
  return reservationView(r);
});
route('POST', '/reservations/:id/cancel', ({ user, params, accessToken }) => {
  const r = db.reservations.find((x) => x.id === params.id);
  if (!r) throw notFound('Réservation');
  if (!canAccessReservation(r, user, accessToken)) throw new ApiError(403, 'forbidden', 'Accès refusé.');
  const staff = can(user, 'reservations:manage');
  if (r.status === 'pending_payment') {
    transition(r, 'cancelled', user?.name || 'client');
    db.transactions.filter((t) => t.reservationId === r.id && t.status === 'pending').forEach((t) => setTx(t, 'cancelled'));
  } else if (r.status === 'confirmed') {
    const pol = cancellationPolicy(r);
    if (!pol.allowed && !staff) throw new ApiError(409, 'too_late', `L’annulation en ligne n’est plus possible moins de ${pol.limitHours} h avant.`);
    const paid = db.transactions.find((t) => t.reservationId === r.id && t.status === 'succeeded');
    if (paid) {
      transition(r, 'refunding', user?.name || 'client');
      setTx(paid, 'refund_pending');
    } else transition(r, 'cancelled', user?.name || 'client');
    log('reservation.cancelled', `Réservation ${r.ref} annulée`);
  } else throw new ApiError(409, 'invalid_transition', 'Cette réservation ne peut plus être annulée.');
  save('reservations');
  return reservationView(r);
});
route('POST', '/reservations/lookup', ({ body }) => {
  const r = db.reservations.find((x) => x.ref === String(body.ref || '').trim().toUpperCase());
  if (!r || r.customer?.email !== String(body.email || '').trim().toLowerCase()) throw new ApiError(404, 'not_found', 'Aucune réservation ne correspond à cette référence et cet e-mail.');
  return { ...reservationView(r, true), cancellation: cancellationPolicy(r) };
});
route('GET', '/me/reservations', ({ user }) => {
  if (!user) throw new ApiError(401, 'unauthenticated', 'Connectez-vous.');
  return db.reservations.filter((r) => r.userId === user.id).map((r) => ({ ...reservationView(r), cancellation: cancellationPolicy(r) }));
});

/* Paiements — l'appel réel à SycaPay se fait UNIQUEMENT côté serveur. */
route('GET', '/payments/methods', () => ({
  provider: 'sycapay',
  mode: 'demo',
  // Liste vide tant que la documentation officielle SycaPay n'a pas confirmé chaque moyen.
  verified: [],
}));
route('POST', '/payments/init', ({ user, body, accessToken }) => {
  const r = db.reservations.find((x) => x.id === body.reservationId);
  if (!r) throw notFound('Réservation');
  if (!canAccessReservation(r, user, accessToken)) throw new ApiError(403, 'forbidden', 'Accès refusé.');
  if (r.status !== 'pending_payment') throw new ApiError(409, 'not_payable', 'Cette réservation n’est plus en attente de paiement.');
  if (!r.customer) throw new ApiError(422, 'customer_missing', 'Renseignez vos coordonnées avant de payer.');
  const existing = db.transactions.find((t) => t.idempotencyKey === body.idempotencyKey);
  if (existing) return existing; // idempotence : un double clic ne crée pas deux transactions
  db.transactions.filter((t) => t.reservationId === r.id && t.status === 'pending').forEach((t) => setTx(t, 'cancelled'));
  const tx = { id: uid('tx'), reservationId: r.id, amount: r.amount, currency: 'XOF', provider: 'sycapay', method: body.method, status: 'pending', createdAt: iso(), updatedAt: iso(), idempotencyKey: body.idempotencyKey, demo: true, checkoutUrl: null, events: [{ status: 'pending', at: iso() }] };
  db.transactions.unshift(tx);
  // Le paiement prolonge le verrou pour laisser le temps de valider sur le téléphone.
  r.expiresAt = new Date(Math.max(new Date(r.expiresAt).getTime(), Date.now() + 5 * 60e3)).toISOString();
  save('payments');
  return tx;
});
route('POST', '/payments/:id/demo-outcome', ({ params, body }) => {
  // Simule la notification serveur-à-serveur que SycaPay enverra au backend.
  const tx = db.transactions.find((t) => t.id === params.id);
  if (!tx) throw notFound('Transaction');
  if (tx.status !== 'pending') return tx;
  setTx(tx, { success: 'succeeded', failure: 'failed', cancel: 'cancelled' }[body.outcome] || 'failed');
  save('payments');
  return tx;
});
route('GET', '/payments/:id/verify', ({ user, params, accessToken }) => {
  const tx = db.transactions.find((t) => t.id === params.id);
  if (!tx) throw notFound('Transaction');
  const r = db.reservations.find((x) => x.id === tx.reservationId);
  if (!canAccessReservation(r, user, accessToken)) throw new ApiError(403, 'forbidden', 'Accès refusé.');
  if (tx.status === 'succeeded' && r.status === 'pending_payment') {
    transition(r, 'confirmed', 'paiement');
    log('payment.succeeded', `Paiement reçu pour ${r.ref}`);
    notify(r);
    save('payments');
  } else if (tx.status === 'succeeded' && r.status === 'expired') {
    // Paiement arrivé après expiration : on rembourse plutôt que de confirmer des places peut-être revendues.
    setTx(tx, 'refund_pending');
    save('payments');
  }
  return { transaction: tx, reservation: reservationView(r) };
});
route('GET', '/me/transactions', ({ user }) => {
  if (!user) throw new ApiError(401, 'unauthenticated', 'Connectez-vous.');
  const mine = new Set(db.reservations.filter((r) => r.userId === user.id).map((r) => r.id));
  return db.transactions.filter((t) => mine.has(t.reservationId)).map((t) => ({ ...t, ref: db.reservations.find((r) => r.id === t.reservationId)?.ref }));
});

function notify(r) {
  db.outbox.unshift({ id: uid('mail'), at: iso(), to: r.customer?.email, subject: `Votre réservation MONARQUE ${r.ref} est confirmée`, reservationId: r.id, demo: true });
  db.outbox = db.outbox.slice(0, 100);
}

/* Administration */
route('GET', '/admin/stats', ({ user }) => { requirePerm(user, 'dashboard:view'); return computeStats(); });
route('GET', '/admin/reservations', ({ user, query }) => {
  requirePerm(user, 'reservations:view');
  const q = (query.q || '').toLowerCase();
  let list = db.reservations;
  if (user.role === 'cinema_manager') list = list.filter((r) => r.kind === 'cinema');
  if (user.role === 'restaurant_manager') list = list.filter((r) => r.kind === 'restaurant');
  if (query.kind) list = list.filter((r) => r.kind === query.kind);
  if (query.status) list = list.filter((r) => r.status === query.status);
  if (q) list = list.filter((r) => r.ref.toLowerCase().includes(q) || r.customer?.name?.toLowerCase().includes(q) || r.customer?.email?.includes(q));
  return { total: list.length, items: list.slice(0, Number(query.limit) || 200).map((r) => reservationView(r)) };
});
route('POST', '/admin/reservations/:id/status', ({ user, params, body }) => {
  requirePerm(user, 'reservations:manage');
  const r = db.reservations.find((x) => x.id === params.id);
  if (!r) throw notFound('Réservation');
  if (body.status === 'refunding') {
    const paid = db.transactions.find((t) => t.reservationId === r.id && t.status === 'succeeded');
    if (!paid) throw new ApiError(409, 'no_payment', 'Aucun paiement à rembourser.');
    setTx(paid, 'refund_pending');
  }
  transition(r, body.status, user.name);
  log('reservation.status', `${r.ref} → ${body.status} (${user.name})`);
  save('reservations');
  return reservationView(r);
});
route('GET', '/admin/transactions', ({ user, query }) => {
  requirePerm(user, 'payments:view');
  let list = db.transactions;
  if (query.status) list = list.filter((t) => t.status === query.status);
  return list.slice(0, 300).map((t) => {
    const r = db.reservations.find((x) => x.id === t.reservationId);
    return { ...t, ref: r?.ref, kind: r?.kind, customer: r?.customer?.name };
  });
});
route('POST', '/admin/transactions/:id/refund', ({ user, params }) => {
  requirePerm(user, 'payments:refund');
  const tx = db.transactions.find((t) => t.id === params.id);
  if (!tx) throw notFound('Transaction');
  const r = db.reservations.find((x) => x.id === tx.reservationId);
  if (tx.status === 'succeeded') {
    setTx(tx, 'refund_pending');
    if (r?.status === 'confirmed') transition(r, 'refunding', user.name);
  }
  if (tx.status === 'refund_pending') {
    // En production : appel au remboursement SycaPay côté serveur, puis confirmation par notification.
    setTx(tx, 'refunded');
    if (r?.status === 'refunding') transition(r, 'cancelled', user.name);
    log('payment.refunded', `Remboursement de ${r?.ref}`);
  } else if (tx.status !== 'refunded') throw new ApiError(409, 'not_refundable', 'Cette transaction ne peut pas être remboursée.');
  save('payments');
  return tx;
});
route('GET', '/admin/users', ({ user }) => { requirePerm(user, 'users:manage'); return db.users.map(publicUser); });
route('POST', '/admin/users', async ({ user, body }) => {
  requirePerm(user, 'users:manage');
  const email = body.email.trim().toLowerCase();
  if (db.users.some((u) => u.email === email)) throw new ApiError(409, 'email_taken', 'Adresse déjà utilisée.');
  const u = { id: uid('u'), name: body.name, email, phone: body.phone || '', role: body.role, passwordHash: await hashPassword(body.password), createdAt: iso() };
  db.users.push(u);
  log('user.created', `Compte ${u.name} créé (${u.role})`);
  save('users');
  return publicUser(u);
});
route('PATCH', '/admin/users/:id', ({ user, params, body }) => {
  requirePerm(user, 'users:manage');
  const u = db.users.find((x) => x.id === params.id);
  if (!u) throw notFound('Utilisateur');
  if (u.id === user.id && body.role && body.role !== u.role) throw new ApiError(409, 'self_demote', 'Vous ne pouvez pas changer votre propre rôle.');
  if (body.role) u.role = body.role;
  save('users');
  return publicUser(u);
});
route('POST', '/admin/demo/reset', async ({ user }) => {
  requirePerm(user, 'demo:reset');
  await resetDemo();
  return { ok: true };
});

/* ───────────── Point d'entrée ───────────── */
export async function handle(method, url, body, { accessToken } = {}) {
  await init();
  sweep();
  const [path, qs] = url.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  const token = localStorage.getItem(TOKEN_KEY);
  const user = currentUser(token);
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = path.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    await new Promise((res) => setTimeout(res, 120 + Math.random() * 180)); // latence réseau simulée
    return structuredClone(await r.handler({ params, query, body: body || {}, user, token, accessToken }));
  }
  throw new ApiError(404, 'no_route', `Route inconnue : ${method} ${path}`);
}

export { TOKEN_KEY, isStaff };
