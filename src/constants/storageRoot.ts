/**
 * Prefijo raíz del bucket según Amplify Storage (por defecto `public`).
 * Las políticas IAM del rol autenticado suelen permitir solo `public/*`.
 */
export const getS3RootPrefix = (): string => {
  const raw = import.meta.env.VITE_S3_ROOT_PREFIX;
  if (raw === undefined) {
    return 'public';
  }
  const trimmed = String(raw).replace(/^\/+|\/+$/g, '');
  if (trimmed === '') {
    return '';
  }
  return trimmed;
};

export const pathUnderStorageRoot = (segment: string): string => {
  const root = getS3RootPrefix();
  const normalized = segment.replace(/^\/+|\/+$/g, '');
  if (!root) {
    return normalized;
  }
  return `${root}/${normalized}`;
};
