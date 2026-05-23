/**
 * Role normalization and routing helpers
 * Handles mapping between backend uppercase roles and frontend lowercase/path conventions
 */

/**
 * Normalize role to lowercase canonical form
 * Supports both backend enum values and legacy lowercase values
 * @param {string} role - Raw role string from backend or storage
 * @returns {string} Normalized role: 'patient', 'worker', or 'admin'
 */
export function normalizeRole(role) {
  if (!role) return 'patient'; // Default fallback

  const normalized = String(role).toLowerCase().trim();

  // Backend enums (uppercase input)
  if (role === 'MOTHER' || normalized === 'mother') return 'patient';
  if (role === 'HEALTH_WORKER' || normalized === 'health_worker') return 'worker';
  if (role === 'ADMIN' || normalized === 'admin') return 'admin';

  // Legacy lowercase support
  if (normalized === 'patient' || normalized === 'mother') return 'patient';
  if (normalized === 'worker' || normalized === 'health_worker') return 'worker';
  if (normalized === 'admin') return 'admin';

  // Unknown role defaults to patient
  return 'patient';
}

/**
 * Get the dashboard path for a role
 * @param {string|object} roleOrUser - Role string or user object with role property
 * @returns {string} Dashboard path (e.g., '/dashboard/patient')
 */
export function getDashboardPath(roleOrUser) {
  let role;

  if (typeof roleOrUser === 'object' && roleOrUser !== null) {
    role = roleOrUser.role;
  } else {
    role = roleOrUser;
  }

  const normalized = normalizeRole(role);
  return `/dashboard/${normalized}`;
}

/**
 * Determine which home component to show based on role
 * @param {string|object} roleOrUser - Role string or user object with role property
 * @returns {string} Component type: 'patient', 'worker', or 'admin'
 */
export function getHomeComponent(roleOrUser) {
  return normalizeRole(roleOrUser?.role || roleOrUser);
}

/**
 * Role constants for consistency
 */
export const ROLES = {
  PATIENT: 'patient',
  WORKER: 'worker',
  ADMIN: 'admin',
};

/**
 * Backend enum to frontend normalized mapping
 * Use this reference for understanding the conversions
 */
export const ROLE_MAPPING = {
  BACKEND: {
    MOTHER: 'patient',
    HEALTH_WORKER: 'worker',
    ADMIN: 'admin',
  },
  FRONTEND: {
    patient: 'patient',
    worker: 'worker',
    admin: 'admin',
  },
};
