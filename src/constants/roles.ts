/** Valores permitidos en el atributo Cognito `custom:role`. */
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  ANALYST: 'ANALYST',
} as const;

/** Alias histórico (grupos Cognito); el rol oficial es `custom:role`. */
export const COGNITO_GROUPS = USER_ROLES;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  ANALYST: 'Analista',
};

export const CUSTOM_ROLE_ATTRIBUTE = 'custom:role';

export const isAdminRole = (role: UserRole | null): boolean => role === USER_ROLES.ADMIN;
