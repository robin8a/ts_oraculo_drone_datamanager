import { fetchAuthSession } from 'aws-amplify/auth';
import type {
  AdminUserSummary,
  CreateUserPayload,
  SupervisorsListResponse,
  UsersListResponse,
} from '../types/workflow';
import { getWorkflowApiConfigHint, resolveWorkflowApiBase } from '../utils/workflowApiBase';

const getApiBase = (): string => resolveWorkflowApiBase();

export { getWorkflowApiConfigHint };

const getIdToken = async (): Promise<string> => {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) {
    throw new Error('No hay token de sesión. Inicia sesión de nuevo.');
  }
  return token;
};

const apiRequest = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const base = getApiBase();
  if (!base) {
    throw new Error(
      getWorkflowApiConfigHint() ??
        'API de administración no configurada. Define VITE_WORKFLOW_API_URL (ver WORKFLOW_SETUP.md).'
    );
  }

  const token = await getIdToken();
  const url = `${base}${path}`;
  if (import.meta.env.DEV) {
    const viaProxy = base.startsWith('/');
    console.info(
      `[workflow-api] ${options.method ?? 'GET'} ${url}`,
      viaProxy
        ? `(Vite reenvía a API Gateway; ver terminal npm run dev)`
        : `(directo a API Gateway)`
    );
  }
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    if (import.meta.env.DEV) {
      console.error('[workflow-api]', response.status, path, body);
    }
    const detail =
      body && typeof body === 'object'
        ? (body as { message?: string; errorName?: string; step?: string; hint?: string })
        : null;
    const parts = [
      detail?.message,
      detail?.step ? `(paso: ${detail.step})` : '',
      detail?.errorName ? `[${detail.errorName}]` : '',
      detail?.hint ?? '',
    ].filter(Boolean);
    const message = parts.length > 0 ? parts.join(' ') : `Error ${response.status}`;
    throw new Error(message);
  }

  return body as T;
};

export const isWorkflowApiConfigured = (): boolean => Boolean(getApiBase());

export const listSupervisors = async (): Promise<SupervisorsListResponse> =>
  apiRequest<SupervisorsListResponse>('/users/supervisors', { method: 'GET' });

export const listUsers = async (): Promise<UsersListResponse> =>
  apiRequest<UsersListResponse>('/users', { method: 'GET' });

export const createAdminUser = async (payload: CreateUserPayload): Promise<AdminUserSummary> =>
  apiRequest<AdminUserSummary>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
