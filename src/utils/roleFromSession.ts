import { fetchAuthSession } from 'aws-amplify/auth';
import { CUSTOM_ROLE_ATTRIBUTE, USER_ROLES, type UserRole } from '../constants/roles';

const VALID_ROLES = new Set<string>([
  USER_ROLES.ADMIN,
  USER_ROLES.SUPERVISOR,
  USER_ROLES.ANALYST,
]);

/** Normaliza el valor de `custom:role` (mayúsculas, sin espacios). */
export const normalizeCustomRole = (value: string | undefined): UserRole | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const upper = value.trim().toUpperCase();
  if (upper === 'ANALISTA') {
    return USER_ROLES.ANALYST;
  }
  if (VALID_ROLES.has(upper)) {
    return upper as UserRole;
  }
  return null;
};

export const parseRoleFromGroups = (groups: string[]): UserRole | null => {
  if (groups.includes(USER_ROLES.ADMIN)) {
    return USER_ROLES.ADMIN;
  }
  if (groups.includes(USER_ROLES.SUPERVISOR)) {
    return USER_ROLES.SUPERVISOR;
  }
  if (groups.includes(USER_ROLES.ANALYST)) {
    return USER_ROLES.ANALYST;
  }
  return null;
};

export const fetchCognitoGroupsFromSession = async (): Promise<string[]> => {
  try {
    const session = await fetchAuthSession();
    const payload = session.tokens?.idToken?.payload ?? session.tokens?.accessToken?.payload;
    if (!payload) {
      return [];
    }
    const raw = payload['cognito:groups'];
    if (Array.isArray(raw)) {
      return raw.filter((g): g is string => typeof g === 'string');
    }
    if (typeof raw === 'string') {
      return [raw];
    }
    return [];
  } catch {
    return [];
  }
};

/** Lee `custom:role` del token JWT si el cliente lo expone en el ID token. */
export const fetchCustomRoleFromToken = async (): Promise<string | undefined> => {
  try {
    const session = await fetchAuthSession();
    const payload = session.tokens?.idToken?.payload ?? session.tokens?.accessToken?.payload;
    if (!payload) {
      return undefined;
    }
    const raw = payload[CUSTOM_ROLE_ATTRIBUTE];
    return typeof raw === 'string' ? raw : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Resuelve el rol del usuario.
 * Prioridad: atributo `custom:role` (perfil Cognito) → mismo atributo en JWT → grupos Cognito.
 */
export const resolveUserRole = (
  customRoleFromAttributes: string | undefined,
  groups: string[] = [],
  customRoleFromToken?: string
): UserRole | null => {
  const fromAttrs = normalizeCustomRole(customRoleFromAttributes);
  if (fromAttrs) {
    return fromAttrs;
  }

  const fromToken = normalizeCustomRole(customRoleFromToken);
  if (fromToken) {
    return fromToken;
  }

  if (groups.length > 0) {
    return parseRoleFromGroups(groups);
  }

  return null;
};
