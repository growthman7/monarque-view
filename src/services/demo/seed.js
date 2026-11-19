/**
 * DONNÉES DE DÉMONSTRATION — entièrement fictives.
 * Films, équipes, établissements, adresses et comptes sont inventés pour illustrer la plateforme.
 * Photographies : Unsplash (licence Unsplash), à remplacer par les visuels réels des établissements.
 */
import { addDays, combineDateTime, toDateKey } from '../../utils/format';
import { generateCinemaPlan, generateRestaurantPlan } from '../../utils/planGenerators';
import { reservationRef, seeded, uid } from '../../utils/ids';

export const unsplash = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?w=${w}&q=72&auto=format&fit=crop`;

export const PHOTOS = {
  cinemaAisle: '1489599849927-2ee91cede3ba',
  cinemaScreen: '1595769816263-9b910be24d5f',
  projector: '1478720568477-152d9b164e26',
  reels: '1440404653325-ab127d49abc1',
};

/** Comptes de démonstration (mode démo uniquement — jamais en production). */
export const DEMO_ACCOUNTS = [
  { id: 'u_super', name: 'Awa Koné', email: 'super@monarque.demo', phone: '+2250700000001', role: 'super_admin', password: 'Monarque2026' },
  { id: 'u_admin', name: 'Yann Brou', email: 'admin@monarque.demo', phone: '+2250700000002', role: 'admin', password: 'Monarque2026' },
  { id: 'u_cine', name: 'Salif Traoré', email: 'cinema@monarque.demo', phone: '+2250700000003', role: 'cinema_manager', password: 'Monarque2026' },
  { id: 'u_resto', name: 'Inès Aka', email: 'restaurant@monarque.demo', phone: '+2250700000004', role: 'restaurant_manager', password: 'Monarque2026' },
  { id: 'u_agent', name: 'Koffi Yao', email: 'agent@monarque.demo', phone: '+2250700000005', role: 'agent', password: 'Monarque2026' },
  { id: 'u_client', name: 'Mariam Diallo', email: 'client@monarque.demo', phone: '+2250700000006', role: 'customer', password: 'Monarque2026' },
];

const FILMS = [
  { title: 'Les Heures Violettes', genres: ['Drame'], duration: 118, rating: 'Tous publics', director: 'Nadia Essoh', cast: ['Aya Kouadio', 'Lucien Morel', 'Fatou Bamba'], synopsis: "Dans un Abidjan suspendu entre deux saisons, une pianiste de cabaret retrouve la lettre qui aurait dû changer sa vie. Elle a une nuit pour en retrouver l'auteur.", poster: { bg: '#1f0a33', ink: '#F8F6FA', accent: '#A855F7', motif: 'sun' } },
  { title: 'Lagune Noire', genres: ['Thriller', 'Policier'], duration: 104, rating: 'Déconseillé -12 ans', director: 'Marc-Olivier Gnaoré', cast: ['Ismaël Diomandé', 'Clara N’Guessan'], synopsis: "Un corps refait surface sous le pont De Gaulle. L'inspectrice Kanga comprend vite que l'eau garde plus de secrets que la ville.", poster: { bg: '#0b1418', ink: '#E8F1F2', accent: '#3FB6A8', motif: 'wave' } },
  { title: 'Le Dernier Projectionniste', genres: ['Comédie dramatique'], duration: 97, rating: 'Tous publics', director: 'Odile Sanogo', cast: ['Bernard Assi', 'Léa Touré'], synopsis: "Le jour où son vieux cinéma de quartier ferme, Gaspard décide d'y projeter une dernière séance… sans dire à personne laquelle.", poster: { bg: '#F2E6D0', ink: '#1A1208', accent: '#C2410C', motif: 'beam' } },
  { title: 'Orbite Basse', genres: ['Science-fiction', 'Aventure'], duration: 132, rating: 'Déconseillé -12 ans', director: 'Kader Ouattara', cast: ['Naomi Kéita', 'Henri Dubois', 'Sami Fofana'], synopsis: "Six mois après la panne mondiale des satellites, une ingénieure de Yamoussoukro tente de remettre en orbite le dernier relais encore debout.", poster: { bg: '#05060f', ink: '#DCE3FF', accent: '#6E7BFF', motif: 'orbit' } },
  { title: 'Fanfare pour un roi', genres: ['Comédie musicale'], duration: 110, rating: 'Tous publics', director: 'Rose Adjoumani', cast: ['Didier Zadi', 'Mireille Yao'], synopsis: "Une fanfare de Grand-Bassam a trois semaines pour préparer le couronnement du plus petit royaume du monde. Rien ne se passe comme prévu.", poster: { bg: '#7628C8', ink: '#FFF6D6', accent: '#F5B84A', motif: 'stripes' } },
  { title: 'Sous la canopée', genres: ['Animation', 'Famille'], duration: 88, rating: 'Tous publics', director: 'Studio Iroko', cast: ['Voix : Ama Kouassi', 'Paul Tanoh'], synopsis: "Une jeune pangoline part à la recherche de la source qui fait chanter la forêt de Taï.", poster: { bg: '#0f2a1d', ink: '#EAF7DF', accent: '#9BE15D', motif: 'leaf' } },
  { title: 'Minuit à Bassam', genres: ['Romance'], duration: 101, rating: 'Tous publics', director: 'Céline Ahoussou', cast: ['Joël Kassi', 'Aminata Cissé'], synopsis: "Deux inconnus ratent le dernier bac et passent la nuit à refaire le monde sur la plage.", poster: { bg: '#120a24', ink: '#F8F6FA', accent: '#F0A6C8', motif: 'moon' }, comingInDays: 12 },
  { title: 'La Couronne de sel', genres: ['Aventure', 'Historique'], duration: 141, rating: 'Déconseillé -12 ans', director: 'Ibrahim Koné', cast: ['Moussa Dao', 'Hélène Kra'], synopsis: "Au XVIIIe siècle, une caravane de sel traverse le Sahel avec, cachée dans sa cargaison, la couronne d'un royaume disparu.", poster: { bg: '#2a1a0c', ink: '#FBEFD9', accent: '#E0A458', motif: 'grid' }, comingInDays: 20 },
];

const HALLS = [
  { name: 'Salle Impériale', rows: 10, perRow: 16, variant: 'classic', prices: { standard: 4000, premium: 6000, vip: 10000 }, formats: ['Dolby Atmos', '2D'] },
  { name: 'Salle Dauphine', rows: 8, perRow: 14, variant: 'wide', prices: { standard: 3500, premium: 5000, vip: 9000 }, formats: ['2D'] },
  { name: 'Salle Couronne', rows: 6, perRow: 10, variant: 'classic', prices: { standard: 6000, premium: 8000, vip: 15000 }, formats: ['Fauteuils inclinables', '2D'] },
];

const week = (open) => [0, 1, 2, 3, 4, 5, 6].map((d) => open(d));

const RESTAURANTS = [
  { name: 'Le Velours', cuisine: 'Gastronomie française', location: 'Plateau', address: 'Boulevard de la République, Plateau, Abidjan', priceRange: 4, ambiance: 'Feutrée, tamisée', template: 'salon', photos: ['1517248135467-4c7edcad34c4', '1414235077428-338989a2e8c0', '1424847651672-bf20a4b0982b'], tagline: 'Une cuisine française de saison, servie dans un salon de velours.', description: "Le Velours a la mémoire des grandes brasseries et l'élégance des salons privés. Le chef y travaille les produits de la lagune et des terroirs ivoiriens avec une grammaire française : sauces montées au beurre, cuissons lentes, desserts à l'assiette.", hours: week((d) => (d === 1 ? [] : [{ open: '19:00', close: '23:30' }])), duration: 120, closures: [] },
  { name: 'Maison Akwaba', cuisine: 'Ivoirienne contemporaine', location: 'Cocody', address: 'Rue des Jardins, Cocody, Abidjan', priceRange: 2, ambiance: 'Chaleureuse, conviviale', template: 'atelier', photos: ['1504674900247-0877df9cc836', '1528605248644-14dd04022da1', '1466978913421-dad2ebd01d17'], tagline: 'Garba, kedjenou et attiéké revisités, à partager.', description: "Une maison de famille devenue table de quartier. Les grands classiques ivoiriens y sont servis en assiettes à partager, autour d'un comptoir où l'on voit la braise travailler.", hours: week((d) => (d === 0 ? [{ open: '12:00', close: '16:00' }] : [{ open: '12:00', close: '15:00' }, { open: '19:00', close: '23:00' }])), duration: 90, closures: [] },
  { name: 'Terrasse Lagune', cuisine: 'Poissons & fruits de mer', location: 'Marcory Zone 4', address: 'Rue du Canal, Zone 4, Marcory, Abidjan', priceRange: 3, ambiance: 'Lumineuse, au bord de l’eau', template: 'lagune', photos: ['1559339352-11d035aa65de', '1600891964599-f61ba0e24092', '1550966871-3ed3cdb5ed0c'], tagline: 'La pêche du jour, les pieds presque dans la lagune.', description: "Posée sur pilotis, la Terrasse Lagune sert la pêche du matin grillée au feu de bois. Le soir, le ponton privé se réserve pour les tablées qui veulent voir le soleil tomber sur Ébrié.", hours: week(() => [{ open: '12:00', close: '15:30' }, { open: '18:30', close: '23:30' }]), duration: 120, closures: [] },
  { name: 'Atelier Brasero', cuisine: 'Grill & cocktails', location: 'Riviera', address: 'Boulevard Mitterrand, Riviera 3, Abidjan', priceRange: 3, ambiance: 'Industrielle, animée', template: 'atelier', photos: ['1514933651103-005eec06c04b', '1555396273-367ea4eb4db5', '1552566626-52f8b828add9'], tagline: 'Viandes maturées, flammes vives et bar à cocktails.', description: "Un ancien entrepôt transformé en atelier du feu. Côté comptoir, on dîne face aux braises ; à l'étage, la mezzanine accueille les tablées plus calmes.", hours: week((d) => (d === 1 ? [] : [{ open: '18:00', close: '00:30' }])), duration: 120, closures: [] },
  { name: 'Nonna Cocody', cuisine: 'Italienne', location: 'Cocody', address: 'Rue Lepic, Cocody Danga, Abidjan', priceRange: 2, ambiance: 'Familiale, solaire', template: 'salon', photos: ['1565299624946-b28f40a0ae38', '1544148103-0773bf10d330', '1592861956120-e524fc739696'], tagline: 'Pâtes fraîches du jour et four à bois.', description: "Les pâtes sont tirées chaque matin, le four à bois ne s'éteint jamais. Une trattoria pour les grandes familles comme pour les dîners à deux.", hours: week(() => [{ open: '12:00', close: '15:00' }, { open: '19:00', close: '23:00' }]), duration: 90, closures: [] },
];

const SLOTS = ['13:30', '16:15', '19:00', '21:45'];

async function hashPassword(pw) {
  const data = new TextEncoder().encode(`monarque:${pw}`);
  // crypto.subtle n'existe qu'en contexte sécurisé (https ou localhost) : ouvert via http://<ip-du-pc>,
  // il manque et la base de démo ne s'initialisait pas.
  // shortcut: empreinte FNV-1a non cryptographique en http simple, acceptable pour la démo uniquement (le vrai backend hache côté serveur).
  if (!globalThis.crypto?.subtle) {
    let h = 0x811c9dc5;
    for (const b of data) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
    return `fnv:${h.toString(16).padStart(8, '0')}`;
  }
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export { hashPassword };

export async function buildSeed() {
  const rnd = seeded(2026);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const db = {
    meta: { version: 1, createdAt: now.toISOString(), demo: true },
    users: [], sessionsAuth: {}, films: [], halls: [], plans: [], sessions: [], restaurants: [],
    reservations: [], transactions: [], outbox: [], activity: [],
  };

  for (const a of DEMO_ACCOUNTS) {
    db.users.push({ id: a.id, name: a.name, email: a.email, phone: a.phone, role: a.role, passwordHash: await hashPassword(a.password), createdAt: now.toISOString() });
  }

  FILMS.forEach((f, i) => {
    const release = f.comingInDays ? addDays(today, f.comingInDays) : addDays(today, -(7 + i * 5));
    db.films.push({
      id: `f_${i + 1}`,
      title: f.title, synopsis: f.synopsis, genres: f.genres, duration: f.duration, rating: f.rating,
      director: f.director, cast: f.cast, releaseDate: toDateKey(release),
      status: f.comingInDays ? 'coming' : 'showing',
      poster: f.poster, posterUrl: '', trailerUrl: '',
    });
  });

  HALLS.forEach((h, i) => {
    const hallId = `h_${i + 1}`;
    const planId = `p_h${i + 1}`;
    const plan = generateCinemaPlan({ name: h.name, rows: h.rows, perRow: h.perRow, variant: h.variant });
    db.plans.push(publishedPlan(planId, 'cinema', hallId, plan, now));
    db.halls.push({ id: hallId, name: h.name, planId, prices: h.prices, formats: h.formats, venue: 'MONARQUE Plateau' });
  });

  RESTAURANTS.forEach((r, i) => {
    const id = `r_${i + 1}`;
    const planId = `p_r${i + 1}`;
    const plan = generateRestaurantPlan(r.template);
    db.plans.push(publishedPlan(planId, 'restaurant', id, { ...plan, name: r.name }, now));
    db.restaurants.push({
      id, planId, name: r.name, cuisine: r.cuisine, location: r.location, address: r.address,
      priceRange: r.priceRange, ambiance: r.ambiance, tagline: r.tagline, description: r.description,
      photos: r.photos.map((p) => unsplash(p)), hours: r.hours, duration: r.duration, closures: r.closures,
      conditions: 'Retard toléré : 15 minutes. Annulation gratuite jusqu’à 3 h avant. Les tables VIP et privées demandent un acompte, déduit de l’addition.',
      phone: `+225 27 20 ${String(30 + i * 7).padStart(2, '0')} ${String(10 + i * 11).padStart(2, '0')} ${String(40 + i).padStart(2, '0')}`,
    });
  });

  // Séances : J-4 (pour l'historique) → J+7
  const showing = db.films.filter((f) => f.status === 'showing');
  for (let d = -4; d <= 7; d += 1) {
    const dateKey = toDateKey(addDays(today, d));
    db.halls.forEach((hall, hi) => {
      SLOTS.forEach((slot, si) => {
        const film = showing[(hi * 4 + si + Math.abs(d)) % showing.length];
        const startsAt = combineDateTime(dateKey, slot);
        db.sessions.push({
          id: `s_${dateKey}_${hi}_${si}`,
          filmId: film.id, hallId: hall.id, startsAt: startsAt.toISOString(),
          format: hall.formats[si % hall.formats.length], language: si === 3 ? 'VOST' : 'VF',
          prices: { ...hall.prices },
        });
      });
    });
  }

  // Réservations existantes (occupation réaliste + historique pour le tableau de bord)
  const customers = ['Adjoua Mensah', 'Pierre Kouamé', 'Sarah Lago', 'Jean Ehui', 'Nina Bédié', 'Omar Sylla', 'Grâce Aboa', 'Luc Gbagbo'];
  const pickCustomer = () => {
    const name = customers[Math.floor(rnd() * customers.length)];
    return { name, email: `${name.split(' ')[0].toLowerCase()}@exemple.ci`, phone: `+22507${Math.floor(10000000 + rnd() * 89999999)}` };
  };
  for (const s of db.sessions) {
    const plan = db.plans.find((p) => p.ownerId === s.hallId);
    const seats = plan.published.elements.filter((x) => x.type === 'seat' && x.status === 'active');
    const fill = 0.12 + rnd() * 0.33;
    const taken = new Set();
    let guard = 0;
    while (taken.size < Math.floor(seats.length * fill) && guard < 2000) {
      guard += 1;
      const start = Math.floor(rnd() * seats.length);
      const groupSize = 2 + Math.floor(rnd() * 4);
      const group = seats.slice(start, start + groupSize).filter((x) => !taken.has(x.id));
      if (!group.length) continue;
      group.forEach((g) => taken.add(g.id));
      const amount = group.reduce((sum, g) => sum + s.prices[g.category], 0);
      const createdAt = new Date(new Date(s.startsAt).getTime() - (1 + rnd() * 72) * 3600e3);
      const past = new Date(s.startsAt) < now;
      pushReservation(db, {
        kind: 'cinema', customer: pickCustomer(), createdAt, amount, paymentRequired: true,
        status: past ? 'completed' : 'confirmed',
        cinema: { sessionId: s.id, seatIds: group.map((g) => g.id), seatLabels: group.map((g) => g.label) },
        lines: group.map((g) => ({ label: `Siège ${g.label} · ${{ standard: "Standard", premium: "Premium", vip: "VIP" }[g.category]}`, amount: s.prices[g.category] })),
      });
    }
  }
  for (const r of db.restaurants) {
    const plan = db.plans.find((p) => p.ownerId === r.id);
    const tables = plan.published.elements.filter((x) => x.type === 'table');
    for (let d = -7; d <= 6; d += 1) {
      const date = addDays(today, d);
      const ranges = r.hours[date.getDay()];
      if (!ranges.length) continue;
      const count = Math.floor(tables.length * (0.2 + rnd() * 0.35));
      const used = new Set();
      for (let k = 0; k < count; k += 1) {
        const t = tables[Math.floor(rnd() * tables.length)];
        if (used.has(t.id)) continue;
        used.add(t.id);
        const range = ranges[ranges.length - 1];
        const time = rnd() > 0.5 ? range.open : addMinutes(range.open, 60);
        const at = combineDateTime(toDateKey(date), time);
        const party = Math.max(1, Math.min(t.capacity, Math.ceil(t.capacity * (0.5 + rnd() * 0.5))));
        const deposit = t.properties.deposit || 0;
        const createdAt = new Date(at.getTime() - (2 + rnd() * 96) * 3600e3);
        pushReservation(db, {
          kind: 'restaurant', customer: pickCustomer(), createdAt, amount: deposit, paymentRequired: deposit > 0,
          status: at < now ? 'completed' : 'confirmed',
          restaurant: { restaurantId: r.id, tableId: t.id, tableLabel: t.label, date: toDateKey(date), time, party, duration: r.duration },
          lines: deposit ? [{ label: `Acompte table ${t.label}`, amount: deposit }] : [],
        });
      }
    }
  }
  db.reservations.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  db.activity = db.reservations.slice(0, 12).map((r) => ({ id: uid('act'), at: r.createdAt, type: 'reservation.confirmed', text: `Réservation ${r.ref} confirmée (${r.kind === 'cinema' ? 'cinéma' : 'restaurant'})` }));
  return db;
}

const addMinutes = (time, m) => {
  const [h, mm] = time.split(':').map(Number);
  const t = h * 60 + mm + m;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

function publishedPlan(id, kind, ownerId, plan, now) {
  const snapshot = { width: plan.width, height: plan.height, gridSize: plan.gridSize, elements: plan.elements };
  return {
    id, kind, ownerId, name: plan.name,
    draft: structuredClone(snapshot),
    published: snapshot,
    publishedVersion: 1,
    versions: [{ version: 1, status: 'published', savedAt: now.toISOString(), savedBy: 'Initialisation', note: 'Plan initial', snapshot: structuredClone(snapshot) }],
    updatedAt: now.toISOString(),
  };
}

function pushReservation(db, { kind, customer, createdAt, amount, paymentRequired, status, cinema, restaurant, lines }) {
  const id = uid('res');
  const created = createdAt.toISOString();
  db.reservations.push({
    id, ref: reservationRef(), kind, status, userId: null, customer, amount, currency: 'XOF', paymentRequired,
    lines, cinema: cinema || null, restaurant: restaurant || null,
    createdAt: created, expiresAt: null,
    history: [{ status: 'pending_payment', at: created, by: 'client' }, { status: 'confirmed', at: created, by: 'système' }, ...(status === 'completed' ? [{ status: 'completed', at: created, by: 'système' }] : [])],
  });
  if (paymentRequired && amount > 0) {
    db.transactions.push({
      id: uid('tx'), reservationId: id, amount, currency: 'XOF', provider: 'sycapay', method: 'demo',
      status: 'succeeded', createdAt: created, updatedAt: created, idempotencyKey: `${id}:1`, demo: true,
      events: [{ status: 'pending', at: created }, { status: 'succeeded', at: created }],
    });
  }
}
