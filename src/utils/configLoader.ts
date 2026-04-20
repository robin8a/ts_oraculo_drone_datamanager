import type { AWSConfig } from '../types/config';

const trimEnv = (value: string | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const readAwsConfigFromEnv = (): AWSConfig => {
  const bucket = trimEnv(import.meta.env.VITE_S3_BUCKET);
  const accessKey = trimEnv(import.meta.env.VITE_AWS_ACCESS_KEY_ID);
  const secretKey = trimEnv(import.meta.env.VITE_AWS_SECRET_ACCESS_KEY);

  if (!bucket || !accessKey || !secretKey) {
    throw new Error(
      'Faltan o están vacías VITE_S3_BUCKET, VITE_AWS_ACCESS_KEY_ID o VITE_AWS_SECRET_ACCESS_KEY. Copia .env.example a .env, completa los valores y reinicia el servidor de desarrollo.'
    );
  }

  return { bucket, accessKey, secretKey };
};

export const loadAWSConfig = async (): Promise<AWSConfig> => {
  try {
    return readAwsConfigFromEnv();
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al leer la configuración S3 desde variables de entorno.';
    throw new Error(errorMessage);
  }
};
