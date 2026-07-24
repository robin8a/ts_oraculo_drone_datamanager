import { pathUnderStorageRoot } from './storageRoot';

/** Metadatos de envíos y notificaciones (JSON en S3), bajo el prefijo Amplify (ej. public/_workflow). */
export const WORKFLOW_META_PREFIX = pathUnderStorageRoot('_workflow');

export const SUBMISSIONS_META_PREFIX = `${WORKFLOW_META_PREFIX}/submissions`;
export const NOTIFICATIONS_META_PREFIX = `${WORKFLOW_META_PREFIX}/notifications`;

/** Catálogo de proyectos: public/_projects/{PROJECT_ID}/ */
export const PROJECTS_META_PREFIX = pathUnderStorageRoot('_projects');

/** Carpetas internas de cada proyecto (como en SAGAMI). */
export const PROJECT_APPROVED_FOLDER = '_approved';
export const PROJECT_STAGING_FOLDER = '_staging';

export const SUBMISSION_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];

const projectsRoot = (): string =>
  PROJECTS_META_PREFIX.endsWith('/') ? PROJECTS_META_PREFIX : `${PROJECTS_META_PREFIX}/`;

/** `public/_projects/{PROJECT_ID}/` — id en mayúsculas en S3. */
export const projectFolderPrefix = (projectId: string): string =>
  `${projectsRoot()}${projectId}/`;

/** Documentación avalada: `public/_projects/{PROJECT_ID}/_approved/` */
export const approvedPrefixForProject = (projectId: string): string =>
  `${projectFolderPrefix(projectId)}${PROJECT_APPROVED_FOLDER}/`;

/** Zona temporal del proyecto: `public/_projects/{PROJECT_ID}/_staging/` */
export const stagingRootForProject = (projectId: string): string =>
  `${projectFolderPrefix(projectId)}${PROJECT_STAGING_FOLDER}/`;

export const stagingPrefixForSubmission = (
  projectId: string,
  analystUsername: string,
  submissionId: string
): string => `${stagingRootForProject(projectId)}${analystUsername}/${submissionId}/`;

/** Etiquetas de UI (ruta relativa al proyecto). */
export const STAGING_ROOT = PROJECT_STAGING_FOLDER;
export const APPROVED_ROOT = PROJECT_APPROVED_FOLDER;

export const submissionMetaKey = (submissionId: string): string =>
  `${SUBMISSIONS_META_PREFIX}/${submissionId}.json`;

export const notificationMetaKey = (supervisorUsername: string, notificationId: string): string =>
  `${NOTIFICATIONS_META_PREFIX}/${supervisorUsername}/${notificationId}.json`;
