/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_S3_BUCKET: string;
  readonly VITE_AWS_ACCESS_KEY_ID: string;
  readonly VITE_AWS_SECRET_ACCESS_KEY: string;
  /** Opcional: prefijo bajo el bucket (p. ej. `public`); ver `getS3RootPrefix`. */
  readonly VITE_S3_ROOT_PREFIX?: string;
}
