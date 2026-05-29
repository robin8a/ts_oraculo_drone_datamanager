/**
 * Resuelve la base URL de la API de administración (Lambda + API Gateway).
 *
 * - Desarrollo: `/workflow-api` (proxy Vite) o URL HTTPS directa.
 * - Producción Amplify: `/workflow-api` (rewrite en amplify.yml) o URL HTTPS directa.
 */
export const resolveWorkflowApiBase = (): string => {
  const raw = import.meta.env.VITE_WORKFLOW_API_URL;
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  const base = raw.trim().replace(/\/$/, '');
  if (!base) {
    return '';
  }

  if (
    import.meta.env.DEV &&
    base.startsWith('/') &&
    !import.meta.env.VITE_WORKFLOW_API_PROXY_TARGET?.trim()
  ) {
    console.warn(
      '[workflow-api] VITE_WORKFLOW_API_URL=/workflow-api requiere VITE_WORKFLOW_API_PROXY_TARGET en .env'
    );
  }

  return base;
};

export const getWorkflowApiConfigHint = (): string | null => {
  const raw = import.meta.env.VITE_WORKFLOW_API_URL;
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return (
      'Define VITE_WORKFLOW_API_URL. En Amplify usa /workflow-api (con rewrite en amplify.yml) ' +
      'o la URL HTTPS de API Gateway.'
    );
  }

  if (resolveWorkflowApiBase()) {
    return null;
  }

  return 'VITE_WORKFLOW_API_URL no es válida.';
};
