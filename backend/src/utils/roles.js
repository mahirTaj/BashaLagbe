export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
};

export const isAdminRole = (role) => role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;