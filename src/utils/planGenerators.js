import { rowLetter, uid } from './ids';

/**
 * Modèle d'un élément de plan (identique côté client, éditeur et serveur) :
 * { id, type, x, y, width, height, rotation, capacity, category, status, label, properties }
 * Coordonnées exprimées dans la scène de référence du plan (plan.width × plan.height),
 * donc indépendantes de la résolution d'affichage.
 */
export const el = (type, x, y, width, height, extra = {}) => ({
  id: uid(type),
  type,
  x: Math.round(x),
  y: Math.round(y),
  width: Math.round(width),
  height: Math.round(height),
  rotation: 0,
  capacity: 0,
  category: null,
  status: 'active',
  label: '',
  properties: {},
  ...extra,
});

export const SEAT_CATEGORIES = {
  standard: { label: 'Standard', color: '#96919E' },
  premium: { label: 'Premium', color: '#A855F7' },
  vip: { label: 'VIP', color: '#E9D5FF' },
};

export const ZONE_COLORS = ['#7628C8', '#2F6F5E', '#8A5A2B', '#6B2147', '#2D4A8A'];

/** Construit une rangée de sièges centrée sur cx, avec une allée optionnelle. */
export function seatRow({ row, count, y, cx, seatW = 34, seatH = 32, gap = 8, aisleAfter = null, aisleW = 36, category = 'standard', startNumber = 1 }) {
  const total = count * seatW + (count - 1) * gap + (aisleAfter ? aisleW : 0);
  let x = cx - total / 2;
  const seats = [];
  for (let i = 0; i < count; i += 1) {
    const n = startNumber + i;
    seats.push(el('seat', x, y, seatW, seatH, {
      label: `${row}${n}`,
      category,
      capacity: 1,
      properties: { row, number: n },
    }));
    x += seatW + gap;
    if (aisleAfter && i + 1 === aisleAfter) x += aisleW;
  }
  return seats;
}

export function generateCinemaPlan({ name = 'Salle', rows = 10, perRow = 16, variant = 'classic' } = {}) {
  const width = 1000;
  const height = 120 + rows * 48 + 120;
  const elements = [];
  elements.push(el('screen', 140, 36, 720, 14, { label: 'Écran', properties: { curve: 26 } }));
  for (let r = 0; r < rows; r += 1) {
    const row = rowLetter(r);
    const isVip = r === rows - 1;
    const isPremium = !isVip && r >= Math.floor(rows * 0.45);
    const count = isVip ? Math.floor(perRow / 2) : variant === 'wide' && r > 2 ? perRow + 2 : perRow;
    const seats = seatRow({
      row,
      count,
      y: 130 + r * 48 + (isVip ? 14 : 0),
      cx: width / 2,
      seatW: isVip ? 62 : 34,
      seatH: isVip ? 36 : 32,
      gap: isVip ? 16 : 8,
      aisleAfter: isVip ? Math.floor(count / 2) : Math.floor(count / 2),
      aisleW: isVip ? 40 : 36,
      category: isVip ? 'vip' : isPremium ? 'premium' : 'standard',
    });
    if (r === 0) {
      seats[0].properties.accessible = true;
      seats[seats.length - 1].properties.accessible = true;
    }
    elements.push(...seats);
  }
  elements.push(el('door', 30, height - 70, 60, 14, { label: 'Entrée' }));
  elements.push(el('door', width - 90, height - 70, 60, 14, { label: 'Sortie' }));
  return { name, kind: 'cinema', width, height, gridSize: 10, elements };
}

const tableSize = (shape, capacity) => {
  if (shape === 'round') return capacity <= 2 ? [56, 56] : capacity <= 4 ? [76, 76] : [100, 100];
  if (shape === 'square') return capacity <= 2 ? [56, 56] : [74, 74];
  return [Math.max(110, capacity * 26), 64];
};

export function table(label, shape, capacity, x, y, extra = {}) {
  const [w, h] = tableSize(shape, capacity);
  return el('table', x, y, w, h, {
    label,
    capacity,
    category: extra.category || 'standard',
    properties: { shape, features: [], minParty: Math.max(1, Math.ceil(capacity / 2) - 1), deposit: 0, ...extra.properties },
    rotation: extra.rotation || 0,
  });
}

export const zone = (name, x, y, w, h, color, props = {}) =>
  el('zone', x, y, w, h, { label: name, properties: { color, ...props } });

/** Trois gabarits d'agencement : chaque restaurant reçoit un plan qui lui est propre. */
export function generateRestaurantPlan(template = 'salon') {
  const W = 1200;
  const H = 820;
  const e = [];
  const wall = (x, y, w, h) => e.push(el('wall', x, y, w, h));

  if (template === 'salon') {
    e.push(zone('Salle principale', 40, 40, 700, 470, ZONE_COLORS[0]));
    e.push(zone('Espace VIP', 760, 40, 400, 250, ZONE_COLORS[3], { vip: true }));
    e.push(zone('Salon privé', 760, 310, 400, 200, ZONE_COLORS[4], { private: true }));
    e.push(zone('Terrasse', 40, 560, 1120, 220, ZONE_COLORS[1], { outdoor: true }));
    wall(30, 30, 1140, 8); wall(30, 30, 8, 490); wall(1162, 30, 8, 490); wall(30, 512, 520, 8); wall(650, 512, 520, 8); wall(748, 30, 8, 490); wall(756, 298, 406, 6);
    e.push(el('door', 552, 508, 96, 14, { label: 'Entrée' }));
    e.push(el('decor', 70, 70, 260, 50, { label: 'Bar', properties: { kind: 'bar' } }));
    e.push(el('decor', 700, 60, 24, 24, { properties: { kind: 'plant' } }));
    e.push(el('decor', 1120, 740, 24, 24, { properties: { kind: 'plant' } }));
    let n = 1;
    for (let r = 0; r < 3; r += 1) for (let c = 0; c < 4; c += 1) {
      const cap = (r + c) % 3 === 0 ? 2 : 4;
      e.push(table(`T${n++}`, cap === 2 ? 'round' : 'square', cap, 90 + c * 160, 170 + r * 110));
    }
    e.push(table(`T${n++}`, 'rect', 8, 820, 90, { category: 'vip', properties: { deposit: 25000, features: ['Vue sur la salle', 'Service dédié'] } }));
    e.push(table(`T${n++}`, 'round', 4, 860, 200, { category: 'vip', properties: { deposit: 15000, features: ['Banquette velours'] } }));
    e.push(table(`T${n++}`, 'round', 4, 1020, 190, { category: 'vip', properties: { deposit: 15000, features: ['Banquette velours'] } }));
    e.push(table(`P1`, 'rect', 10, 800, 360, { category: 'private', properties: { deposit: 50000, minParty: 6, features: ['Pièce fermée', 'Écran de présentation'] } }));
    for (let c = 0; c < 6; c += 1) e.push(table(`E${c + 1}`, c % 2 ? 'round' : 'square', c % 3 === 0 ? 6 : 4, 90 + c * 180, 620, { properties: { features: ['Extérieur'] } }));
  }

  if (template === 'lagune') {
    e.push(zone('Salle principale', 40, 40, 560, 420, ZONE_COLORS[0]));
    e.push(zone('Terrasse sur l’eau', 620, 40, 540, 740, ZONE_COLORS[1], { outdoor: true }));
    e.push(zone('Ponton privé', 40, 480, 560, 300, ZONE_COLORS[4], { private: true, outdoor: true }));
    wall(30, 30, 580, 8); wall(30, 30, 8, 440); wall(30, 462, 580, 8); wall(602, 30, 8, 180); wall(602, 300, 8, 170);
    e.push(el('door', 596, 212, 14, 86, { label: 'Accès terrasse' }));
    e.push(el('door', 260, 456, 90, 14, { label: 'Entrée' }));
    e.push(el('decor', 60, 60, 24, 380, { label: 'Vivier', properties: { kind: 'bar' } }));
    let n = 1;
    for (let r = 0; r < 3; r += 1) for (let c = 0; c < 3; c += 1) e.push(table(`S${n++}`, 'round', r === 1 ? 4 : 2, 140 + c * 150, 90 + r * 120));
    n = 1;
    for (let r = 0; r < 5; r += 1) for (let c = 0; c < 3; c += 1) e.push(table(`L${n++}`, c === 1 ? 'square' : 'round', c === 1 ? 4 : 2, 680 + c * 160, 80 + r * 135, { properties: { features: ['Vue lagune'] } }));
    e.push(table('PO1', 'rect', 12, 120, 560, { category: 'private', rotation: 0, properties: { deposit: 60000, minParty: 8, features: ['Ponton privatisable', 'Coucher de soleil'] } }));
    e.push(table('PO2', 'round', 6, 440, 640, { category: 'private', properties: { deposit: 30000, minParty: 4, features: ['Ponton'] } }));
  }

  if (template === 'atelier') {
    e.push(zone('Comptoir', 40, 40, 1120, 200, ZONE_COLORS[2]));
    e.push(zone('Salle principale', 40, 260, 760, 520, ZONE_COLORS[0]));
    e.push(zone('Mezzanine VIP', 820, 260, 340, 520, ZONE_COLORS[3], { vip: true }));
    wall(30, 30, 1140, 8); wall(30, 30, 8, 760); wall(1162, 30, 8, 760); wall(30, 782, 1140, 8); wall(808, 260, 8, 380);
    e.push(el('door', 380, 776, 100, 14, { label: 'Entrée' }));
    e.push(el('decor', 80, 60, 1040, 40, { label: 'Comptoir & braises', properties: { kind: 'bar' } }));
    for (let c = 0; c < 8; c += 1) e.push(table(`C${c + 1}`, 'round', 2, 90 + c * 130, 140, { properties: { features: ['Au comptoir', 'Vue cuisine'] } }));
    let n = 1;
    for (let r = 0; r < 3; r += 1) for (let c = 0; c < 4; c += 1) e.push(table(`T${n++}`, r === 2 ? 'rect' : 'square', r === 2 ? 6 : 4, 90 + c * 180, 310 + r * 150));
    e.push(table('M1', 'rect', 8, 880, 320, { category: 'vip', rotation: 90, properties: { deposit: 20000, minParty: 5, features: ['Mezzanine'] } }));
    e.push(table('M2', 'round', 4, 950, 560, { category: 'vip', properties: { deposit: 10000, features: ['Mezzanine'] } }));
    e.push(table('M3', 'round', 4, 950, 680, { category: 'vip', properties: { deposit: 10000, features: ['Mezzanine'] } }));
  }

  return { kind: 'restaurant', width: W, height: H, gridSize: 10, elements: assignZones(e) };
}

/** Rattache chaque table à la zone qui contient son centre. */
export function assignZones(elements) {
  const zones = elements.filter((z) => z.type === 'zone');
  return elements.map((item) => {
    if (item.type !== 'table') return item;
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const z = zones.find((zz) => cx >= zz.x && cx <= zz.x + zz.width && cy >= zz.y && cy <= zz.y + zz.height);
    return { ...item, properties: { ...item.properties, zoneId: z ? z.id : null } };
  });
}

/** Contrôles avant publication d'un plan. Retourne { errors, warnings }. */
export function validatePlan(plan) {
  const errors = [];
  const warnings = [];
  const labels = new Map();
  const bookable = plan.elements.filter((x) => x.type === 'seat' || x.type === 'table');
  for (const item of bookable) {
    if (!item.label) errors.push(`Un ${item.type === 'seat' ? 'siège' : 'table'} n'a pas d'identifiant.`);
    else if (labels.has(item.label)) errors.push(`Identifiant en double : ${item.label}.`);
    labels.set(item.label, true);
    if (item.x < 0 || item.y < 0 || item.x + item.width > plan.width || item.y + item.height > plan.height) warnings.push(`${item.label || item.type} dépasse les limites du plan.`);
    if (item.type === 'table' && (!item.capacity || item.capacity < 1)) errors.push(`La table ${item.label} n'a pas de capacité.`);
  }
  if (plan.kind === 'cinema') {
    if (!plan.elements.some((x) => x.type === 'screen')) errors.push("La salle n'a pas d'écran de projection.");
    if (!plan.elements.some((x) => x.type === 'seat')) errors.push('La salle ne contient aucun siège.');
  } else {
    if (!plan.elements.some((x) => x.type === 'table')) errors.push('Le restaurant ne contient aucune table.');
    const withZones = assignZones(plan.elements);
    withZones.filter((t) => t.type === 'table' && !t.properties.zoneId).forEach((t) => warnings.push(`La table ${t.label} n'est dans aucune zone.`));
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}
