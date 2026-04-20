/**
 * Prefijo bajo el bucket donde Amplify Storage suele conceder permisos al rol autenticado
 * (`s3:ListBucket` con condición `s3:prefix` como `public/*`).
 * Sin prefijo, ListObjects en la raíz del bucket suele devolver 403.
 *
 * Cambia con variable de entorno: `VITE_S3_ROOT_PREFIX` (ej. `protected` si usas rutas protegidas).
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

/** `public/{projectId}/` (o `{root}/{projectId}/`) */
export const projectRootPrefixInS3 = (projectId: string): string => {
  const root = getS3RootPrefix();
  return root ? `${root}/${projectId}/` : `${projectId}/`;
};

/** Prefijo para ListObjectsV2 bajo el proyecto y la ruta actual del UI. */
export const listPrefixForProjectPath = (projectId: string, currentPath: string): string => {
  const base = projectRootPrefixInS3(projectId);
  if (!currentPath) {
    return base;
  }
  const normalized = currentPath.endsWith('/') ? currentPath : `${currentPath}/`;
  return `${base}${normalized}`;
};

/** Clave S3 de un objeto o carpeta nueva bajo la ruta actual. */
export const objectKeyInProjectPath = (
  projectId: string,
  currentPath: string,
  name: string,
  isFolder: boolean
): string => {
  const base = listPrefixForProjectPath(projectId, currentPath);
  return isFolder ? `${base}${name}/` : `${base}${name}`;
};
