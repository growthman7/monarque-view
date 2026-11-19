/**
 * Services métier : un module par ressource, aucun appel réseau dans les composants.
 */
import { accessStore, api, tokenStore } from './api/client';

const qs = (o) => {
  const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const authService = {
  async login(email, password) {
    const r = await api.post('/auth/login', { email, password });
    tokenStore.set(r.token);
    return r.user;
  },
  async demoLogin(email) {
    const r = await api.post('/auth/demo-login', { email });
    tokenStore.set(r.token);
    return r.user;
  },
  async register(data) {
    const r = await api.post('/auth/register', data);
    tokenStore.set(r.token);
    return r.user;
  },
  async logout() {
    try { await api.post('/auth/logout'); } finally { tokenStore.set(null); }
  },
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
};

export const filmService = {
  list: () => api.get('/films'),
  get: (id) => api.get(`/films/${id}`),
  create: (d) => api.post('/films', d),
  update: (id, d) => api.put(`/films/${id}`, d),
  remove: (id) => api.del(`/films/${id}`),
};

export const sessionService = {
  list: (filters = {}) => api.get(`/sessions${qs(filters)}`),
  get: (id) => api.get(`/sessions/${id}`),
  create: (d) => api.post('/sessions', d),
  remove: (id) => api.del(`/sessions/${id}`),
};

export const seatService = {
  availability: (sessionId, exclude) => api.get(`/sessions/${sessionId}/seats${qs({ exclude })}`),
};

export const hallService = {
  list: () => api.get('/halls'),
  create: (d) => api.post('/halls', d),
  update: (id, d) => api.put(`/halls/${id}`, d),
};

export const restaurantService = {
  list: () => api.get('/restaurants'),
  get: (id) => api.get(`/restaurants/${id}`),
  create: (d) => api.post('/restaurants', d),
  update: (id, d) => api.put(`/restaurants/${id}`, d),
  remove: (id) => api.del(`/restaurants/${id}`),
};

export const tableService = {
  availability: (restaurantId, { date, time, party, exclude }) => api.get(`/restaurants/${restaurantId}/availability${qs({ date, time, party, exclude })}`),
};

export const planService = {
  getPublished: (id) => api.get(`/plans/${id}`),
  getDraft: (id) => api.get(`/plans/${id}?draft=1`),
  saveDraft: (id, plan) => api.put(`/plans/${id}/draft`, plan),
  publish: (id) => api.post(`/plans/${id}/publish`),
  restore: (id, version) => api.post(`/plans/${id}/restore/${version}`),
};

export const reservationService = {
  async hold(payload) {
    const r = await api.post('/reservations', payload);
    accessStore.set(r.id, r.accessToken);
    return r;
  },
  get: (id) => api.get(`/reservations/${id}`, { reservationId: id }),
  setCustomer: (id, customer) => api.patch(`/reservations/${id}/customer`, customer, { reservationId: id }),
  confirm: (id) => api.post(`/reservations/${id}/confirm`, null, { reservationId: id }),
  cancel: (id) => api.post(`/reservations/${id}/cancel`, null, { reservationId: id }),
  async lookup(ref, email) {
    const r = await api.post('/reservations/lookup', { ref, email });
    accessStore.set(r.id, r.accessToken);
    return r;
  },
  mine: () => api.get('/me/reservations'),
};

export const paymentService = {
  methods: () => api.get('/payments/methods'),
  init: ({ reservationId, method, idempotencyKey }) => api.post('/payments/init', { reservationId, method, idempotencyKey }, { reservationId }),
  verify: (txId, reservationId) => api.get(`/payments/${txId}/verify`, { reservationId }),
  /** Mode démo uniquement : simule la notification serveur de SycaPay. */
  demoOutcome: (txId, outcome) => api.post(`/payments/${txId}/demo-outcome`, { outcome }),
  mine: () => api.get('/me/transactions'),
};

export const adminService = {
  stats: () => api.get('/admin/stats'),
  reservations: (f = {}) => api.get(`/admin/reservations${qs(f)}`),
  setStatus: (id, status) => api.post(`/admin/reservations/${id}/status`, { status }),
  transactions: (f = {}) => api.get(`/admin/transactions${qs(f)}`),
  refund: (id) => api.post(`/admin/transactions/${id}/refund`),
  users: () => api.get('/admin/users'),
  createUser: (d) => api.post('/admin/users', d),
  updateUser: (id, d) => api.patch(`/admin/users/${id}`, d),
  resetDemo: () => api.post('/admin/demo/reset'),
};

/** Notifications temps réel : en démo, changements de la base locale (autres onglets inclus). */
export const notificationService = {
  subscribe(cb) {
    const h = (e) => cb(e.detail);
    window.addEventListener('monarque:db-change', h);
    return () => window.removeEventListener('monarque:db-change', h);
  },
};
