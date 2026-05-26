import { APPROVED_ROOT } from './workflowStorage';
import { getS3RootPrefix } from './storageRoot';

export { getS3RootPrefix } from './storageRoot';

/** `public/{projectId}/` (o `{root}/{projectId}/`) — legado / Amplify Storage */
export const projectRootPrefixInS3 = (projectId: string): string => {
  const root = getS3RootPrefix();
  return root ? `${root}/${projectId}/` : `${projectId}/`;
};

/** `{root}/approved/{projectId}/` — documentación avalada */
export const approvedProjectRootPrefixInS3 = (projectId: string): string =>
  `${APPROVED_ROOT}/${projectId}/`;

export const listPrefixForApprovedProjectPath = (
  projectId: string,
  currentPath: string
): string => {
  const base = approvedProjectRootPrefixInS3(projectId);
  if (!currentPath) {
    return base;
  }
  const normalized = currentPath.endsWith('/') ? currentPath : `${currentPath}/`;
  return `${base}${normalized}`;
};

export const objectKeyInApprovedProjectPath = (
  projectId: string,
  currentPath: string,
  name: string,
  isFolder: boolean
): string => {
  const base = listPrefixForApprovedProjectPath(projectId, currentPath);
  return isFolder ? `${base}${name}/` : `${base}${name}`;
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

const normalizePrefix = (prefix: string): string =>
  prefix.endsWith('/') ? prefix : `${prefix}/`;

/** Prefijo de listado bajo un envío en staging + ruta territorial del UI. */
export const listPrefixForStagingSubmissionPath = (
  stagingPrefix: string,
  currentPath: string
): string => {
  const base = normalizePrefix(stagingPrefix);
  if (!currentPath) {
    return base;
  }
  const normalized = currentPath.endsWith('/') ? currentPath : `${currentPath}/`;
  return `${base}${normalized}`;
};

export const objectKeyInStagingSubmissionPath = (
  stagingPrefix: string,
  currentPath: string,
  name: string,
  isFolder: boolean
): string => {
  const base = listPrefixForStagingSubmissionPath(stagingPrefix, currentPath);
  return isFolder ? `${base}${name}/` : `${base}${name}`;
};

export const stagingSubmissionRootPrefix = (stagingPrefix: string): string =>
  normalizePrefix(stagingPrefix);
