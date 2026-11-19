export const ROLES = {
  customer: 'Client',
  super_admin: 'Super administrateur',
  admin: 'Administrateur',
  cinema_manager: 'Gestionnaire cinéma',
  restaurant_manager: 'Gestionnaire restaurant',
  agent: 'Agent de réservation',
};

export const STAFF_ROLES = ['super_admin', 'admin', 'cinema_manager', 'restaurant_manager', 'agent'];

const ALL = [
  'dashboard:view', 'films:manage', 'sessions:manage', 'halls:manage', 'restaurants:manage',
  'plans:edit', 'plans:publish', 'reservations:view', 'reservations:manage',
  'payments:view', 'payments:refund', 'users:manage', 'demo:reset',
];

/** Matrice rôle → permissions. Le serveur (ou le serveur de démonstration) la revérifie à chaque appel. */
export const PERMISSIONS = {
  super_admin: ALL,
  admin: ALL.filter((p) => p !== 'users:manage' && p !== 'demo:reset'),
  cinema_manager: ['dashboard:view', 'films:manage', 'sessions:manage', 'halls:manage', 'plans:edit', 'plans:publish', 'reservations:view', 'reservations:manage'],
  restaurant_manager: ['dashboard:view', 'restaurants:manage', 'plans:edit', 'plans:publish', 'reservations:view', 'reservations:manage'],
  agent: ['dashboard:view', 'reservations:view', 'reservations:manage', 'payments:view'],
  customer: [],
};

export const can = (user, permission) => !!user && (PERMISSIONS[user.role] || []).includes(permission);
export const isStaff = (user) => !!user && STAFF_ROLES.includes(user.role);

/** Un gestionnaire cinéma ne publie que des plans de salle, un gestionnaire restaurant que des plans de restaurant. */
export const canEditPlanKind = (user, kind) => {
  if (!can(user, 'plans:edit')) return false;
  if (user.role === 'cinema_manager') return kind === 'cinema';
  if (user.role === 'restaurant_manager') return kind === 'restaurant';
  return true;
};
