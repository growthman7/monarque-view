/**
 * Client API unique. Avec VITE_API_URL : appels REST réels (fetch).
 * Sans : serveur de démonstration local, même contrat de routes.
 */
import { ApiError, TOKEN_KEY, handle } from '../demo/demoServer';

const BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
export const DEMO_MODE = !BASE;
const ACCESS_KEY = 'monarque.access'; // jetons d'accès aux réservations invitées

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)),
};

export const accessStore = {
  all() {
    try { return JSON.parse(localStorage.getItem(ACCESS_KEY) || '{}'); } catch { return {}; }
  },
  get(id) { return this.all()[id]; },
  set(id, token) {
    const all = this.all();
    all[id] = token;
    localStorage.setItem(ACCESS_KEY, JSON.stringify(all));
  },
};

export async function request(method, path, body, { reservationId } = {}) {
  const accessToken = reservationId ? accessStore.get(reservationId) : undefined;
  if (DEMO_MODE) return handle(method, path, body, { accessToken });

  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (accessToken) headers['X-Reservation-Access'] = accessToken;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'network', 'Connexion impossible. Vérifiez votre réseau et réessayez.');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.code || 'error', data?.message || 'Une erreur est survenue.', data?.details);
  return data;
}

export const api = {
  get: (p, o) => request('GET', p, undefined, o),
  post: (p, b, o) => request('POST', p, b, o),
  put: (p, b, o) => request('PUT', p, b, o),
  patch: (p, b, o) => request('PATCH', p, b, o),
  del: (p, o) => request('DELETE', p, undefined, o),
};

export { ApiError };
