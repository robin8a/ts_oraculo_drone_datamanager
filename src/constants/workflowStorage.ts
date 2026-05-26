import { pathUnderStorageRoot } from './storageRoot';

/** Metadatos de envíos y notificaciones (JSON en S3), bajo el prefijo Amplify (ej. public/_workflow). */
export const WORKFLOW_META_PREFIX = pathUnderStorageRoot('_workflow');

export const SUBMISSIONS_META_PREFIX = `${WORKFLOW_META_PREFIX}/submissions`;
export const NOTIFICATIONS_META_PREFIX = `${WORKFLOW_META_PREFIX}/notifications`;

/** Zona temporal: solo analistas suben aquí (ej. public/staging). */
export const STAGING_ROOT = pathUnderStorageRoot('staging');

/** Zona definitiva tras aval del supervisor (ej. public/approved). */
export const APPROVED_ROOT = pathUnderStorageRoot('approved');

export const SUBMISSION_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];

export const stagingPrefixForSubmission = (
  projectId: string,
  analystUsername: string,
  submissionId: string
): string => `${STAGING_ROOT}/${projectId}/${analystUsername}/${submissionId}/`;

export const approvedPrefixForProject = (projectId: string): string => `${APPROVED_ROOT}/${projectId}/`;

export const submissionMetaKey = (submissionId: string): string =>
  `${SUBMISSIONS_META_PREFIX}/${submissionId}.json`;

export const notificationMetaKey = (supervisorUsername: string, notificationId: string): string =>
  `${NOTIFICATIONS_META_PREFIX}/${supervisorUsername}/${notificationId}.json`;
