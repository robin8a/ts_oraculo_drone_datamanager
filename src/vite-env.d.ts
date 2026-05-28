/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_S3_BUCKET: string;
  readonly VITE_AWS_ACCESS_KEY_ID: string;
  readonly VITE_AWS_SECRET_ACCESS_KEY: string;
  /** Opcional: prefijo bajo el bucket (p. ej. `public`); ver `getS3RootPrefix`. */
  readonly VITE_S3_ROOT_PREFIX?: string;
  /**
   * API Gateway (Lambda administración).
   * Producción/Amplify: URL HTTPS completa.
   * Desarrollo: URL HTTPS o `/workflow-api` con VITE_WORKFLOW_API_PROXY_TARGET.
   */
  readonly VITE_WORKFLOW_API_URL?: string;
  /** Solo desarrollo: destino del proxy Vite cuando VITE_WORKFLOW_API_URL=/workflow-api */
  readonly VITE_WORKFLOW_API_PROXY_TARGET?: string;
}
