/**
 * Resuelve la base URL de la API de administración (Lambda + API Gateway).
 *
 * - Desarrollo: puede usar `/workflow-api` (proxy de Vite) o URL HTTPS directa.
 * - Producción (Amplify): debe ser la URL HTTPS de API Gateway; el proxy de Vite no existe.
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

  // En build de producción, /workflow-api apuntaría al mismo host de Amplify (404).
  if (import.meta.env.PROD && base.startsWith('/')) {
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
    return 'Define VITE_WORKFLOW_API_URL con la URL de API Gateway (ver WORKFLOW_SETUP.md).';
  }

  if (import.meta.env.PROD && raw.trim().startsWith('/')) {
    return (
      'En Amplify/producción no uses /workflow-api. En Environment variables pon ' +
      'VITE_WORKFLOW_API_URL=https://TU-API.execute-api.REGION.amazonaws.com y vuelve a desplegar.'
    );
  }

  if (resolveWorkflowApiBase()) {
    return null;
  }

  return 'VITE_WORKFLOW_API_URL no es válida. Usa la URL HTTPS de API Gateway sin barra final.';
};
