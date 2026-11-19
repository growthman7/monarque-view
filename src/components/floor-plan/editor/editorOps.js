import { el, seatRow, table, zone, ZONE_COLORS } from '../../../utils/planGenerators';
import { rowLetter, uid } from '../../../utils/ids';

/** Opérations pures de l'éditeur : elles reçoivent des éléments et renvoient de nouveaux éléments. */

export function createElement(type, center, opts = {}) {
  const at = (w, h) => [center.x - w / 2, center.y - h / 2];
  switch (type) {
    case 'seat': { const [x, y] = at(34, 32); return el('seat', x, y, 34, 32, { label: 'S1', category: 'standard', capacity: 1, properties: { row: 'S', number: 1 } }); }
    case 'screen': { const [x, y] = at(600, 14); return el('screen', x, y, 600, 14, { label: 'Écran', properties: { curve: 24 } }); }
    case 'table-round': { const t = table(opts.label || 'T', 'round', 4, 0, 0); return { ...t, x: center.x - t.width / 2, y: center.y - t.height / 2 }; }
    case 'table-square': { const t = table(opts.label || 'T', 'square', 4, 0, 0); return { ...t, x: center.x - t.width / 2, y: center.y - t.height / 2 }; }
    case 'table-rect': { const t = table(opts.label || 'T', 'rect', 6, 0, 0); return { ...t, x: center.x - t.width / 2, y: center.y - t.height / 2 }; }
    case 'zone': { const [x, y] = at(320, 220); return zone(opts.label || 'Nouvelle zone', x, y, 320, 220, ZONE_COLORS[opts.colorIndex % ZONE_COLORS.length || 0]); }
    case 'wall': { const [x, y] = at(240, 8); return el('wall', x, y, 240, 8); }
    case 'door': { const [x, y] = at(90, 14); return el('door', x, y, 90, 14, { label: 'Porte' }); }
    case 'bar': { const [x, y] = at(220, 46); return el('decor', x, y, 220, 46, { label: 'Bar', properties: { kind: 'bar' } }); }
    case 'plant': { const [x, y] = at(26, 26); return el('decor', x, y, 26, 26, { properties: { kind: 'plant' } }); }
    case 'label': { const [x, y] = at(140, 24); return el('label', x, y, 140, 24, { label: 'Repère' }); }
    default: return null;
  }
}

/** Libellé suivant non utilisé : T1, T2… */
export function nextLabel(elements, prefix) {
  const used = new Set(elements.map((e) => e.label));
  let n = 1;
  while (used.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

export function nextRowLetter(elements) {
  const rows = new Set(elements.filter((e) => e.type === 'seat').map((e) => e.properties?.row));
  let i = 0;
  while (rows.has(rowLetter(i))) i += 1;
  return rowLetter(i);
}

export function addRow(elements, { row, count, startNumber, category, seatW, gap, aisleAfter, cx, y }) {
  return [...elements, ...seatRow({ row, count: Number(count), startNumber: Number(startNumber), category, seatW: Number(seatW), seatH: Math.round(Number(seatW) * 0.94), gap: Number(gap), aisleAfter: Number(aisleAfter) || null, cx, y })];
}

/** Duplique la sélection. Pour une rangée de sièges : nouvelle lettre de rang, décalée vers le fond. */
export function duplicate(elements, ids) {
  const sel = elements.filter((e) => ids.includes(e.id));
  if (!sel.length) return { elements, ids: [] };
  const seatsOnly = sel.every((e) => e.type === 'seat');
  const rows = [...new Set(sel.map((e) => e.properties?.row))];
  let copies;
  if (seatsOnly && rows.length === 1) {
    const letter = nextRowLetter(elements);
    const dy = Math.max(...sel.map((e) => e.height)) + 16;
    const maxY = Math.max(...elements.filter((e) => e.type === 'seat').map((e) => e.y));
    const minSelY = Math.min(...sel.map((e) => e.y));
    const shift = maxY - minSelY + dy;
    copies = sel.map((e) => ({ ...structuredClone(e), id: uid('seat'), y: e.y + shift, label: `${letter}${e.properties.number}`, properties: { ...e.properties, row: letter } }));
  } else {
    copies = sel.map((e) => {
      const c = { ...structuredClone(e), id: uid(e.type), x: e.x + 24, y: e.y + 24 };
      if (e.type === 'table') c.label = nextLabel([...elements], e.label.replace(/\d+$/, '') || 'T');
      if (e.type === 'seat') c.label = `${e.properties.row}${e.properties.number}′`;
      return c;
    });
    // libellés uniques pour plusieurs tables copiées en même temps
    const all = [...elements];
    copies.forEach((c) => { if (c.type === 'table') { c.label = nextLabel(all, c.label.replace(/\d+$/, '') || 'T'); } all.push(c); });
  }
  return { elements: [...elements, ...copies], ids: copies.map((c) => c.id) };
}

export function align(elements, ids, mode) {
  const sel = elements.filter((e) => ids.includes(e.id));
  if (sel.length < 2) return elements;
  const minX = Math.min(...sel.map((e) => e.x));
  const maxX = Math.max(...sel.map((e) => e.x + e.width));
  const minY = Math.min(...sel.map((e) => e.y));
  const maxY = Math.max(...sel.map((e) => e.y + e.height));
  return elements.map((e) => {
    if (!ids.includes(e.id)) return e;
    switch (mode) {
      case 'left': return { ...e, x: minX };
      case 'right': return { ...e, x: maxX - e.width };
      case 'hcenter': return { ...e, x: Math.round((minX + maxX) / 2 - e.width / 2) };
      case 'top': return { ...e, y: minY };
      case 'bottom': return { ...e, y: maxY - e.height };
      case 'vcenter': return { ...e, y: Math.round((minY + maxY) / 2 - e.height / 2) };
      default: return e;
    }
  });
}

export function distribute(elements, ids, axis) {
  const sel = elements.filter((e) => ids.includes(e.id)).sort((a, b) => (axis === 'h' ? a.x - b.x : a.y - b.y));
  if (sel.length < 3) return elements;
  const k = axis === 'h' ? 'x' : 'y';
  const size = axis === 'h' ? 'width' : 'height';
  const start = sel[0][k];
  const end = sel[sel.length - 1][k] + sel[sel.length - 1][size];
  const total = sel.reduce((s, e) => s + e[size], 0);
  const gap = (end - start - total) / (sel.length - 1);
  let cur = start;
  const pos = {};
  sel.forEach((e) => { pos[e.id] = Math.round(cur); cur += e[size] + gap; });
  return elements.map((e) => (pos[e.id] !== undefined ? { ...e, [k]: pos[e.id] } : e));
}

/** Renumérote les sièges : rangées par position verticale (A depuis l'écran), numéros de gauche à droite. */
export function renumberSeats(elements) {
  const seats = elements.filter((e) => e.type === 'seat').sort((a, b) => a.y - b.y);
  const rows = [];
  seats.forEach((s) => {
    const cy = s.y + s.height / 2;
    const r = rows.find((row) => Math.abs(row.cy - cy) < Math.max(10, s.height * 0.45));
    if (r) r.list.push(s); else rows.push({ cy, list: [s] });
  });
  const map = {};
  rows.forEach((r, i) => {
    r.list.sort((a, b) => a.x - b.x).forEach((s, j) => { map[s.id] = { row: rowLetter(i), number: j + 1 }; });
  });
  return elements.map((e) => (map[e.id] ? { ...e, label: `${map[e.id].row}${map[e.id].number}`, properties: { ...e.properties, ...map[e.id] } } : e));
}
