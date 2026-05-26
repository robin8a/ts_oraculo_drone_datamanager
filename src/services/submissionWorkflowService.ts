import { CopyObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { S3Connection } from '../types/s3';
import type { SubmissionRecord, WorkflowNotification } from '../types/workflow';
import {
  NOTIFICATIONS_META_PREFIX,
  SUBMISSION_STATUS,
  approvedPrefixForProject,
  notificationMetaKey,
  stagingPrefixForSubmission,
  submissionMetaKey,
} from '../constants/workflowStorage';
import { getJsonObject, listAllSubmissions, putJsonObject } from './workflowS3MetaService';
import type { UserRole } from '../constants/roles';
import { USER_ROLES } from '../constants/roles';

const newSubmissionId = (): string =>
  `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const newNotificationId = (): string =>
  `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const createDraftSubmission = async (
  conn: S3Connection,
  params: {
    projectId: string;
    analystUsername: string;
    supervisorUsername: string;
    notes?: string;
  }
): Promise<SubmissionRecord> => {
  const id = newSubmissionId();
  const record: SubmissionRecord = {
    id,
    projectId: params.projectId,
    analystUsername: params.analystUsername,
    supervisorUsername: params.supervisorUsername,
    status: SUBMISSION_STATUS.DRAFT,
    stagingPrefix: stagingPrefixForSubmission(
      params.projectId,
      params.analystUsername,
      id
    ),
    createdAt: new Date().toISOString(),
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    rejectReason: null,
    fileCount: 0,
    notes: params.notes ?? null,
  };
  await putJsonObject(conn, submissionMetaKey(id), record);
  return record;
};

export const getSubmission = async (
  conn: S3Connection,
  submissionId: string
): Promise<SubmissionRecord | null> =>
  getJsonObject<SubmissionRecord>(conn, submissionMetaKey(submissionId));

export const saveSubmission = async (
  conn: S3Connection,
  record: SubmissionRecord
): Promise<void> => {
  await putJsonObject(conn, submissionMetaKey(record.id), record);
};

export interface StagingFileItem {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
}

export const listSubmissionStagingFiles = async (
  conn: S3Connection,
  stagingPrefix: string
): Promise<StagingFileItem[]> => {
  const normalized = stagingPrefix.endsWith('/') ? stagingPrefix : `${stagingPrefix}/`;
  const items: StagingFileItem[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await conn.client.send(
      new ListObjectsV2Command({
        Bucket: conn.bucket,
        Prefix: normalized,
        ContinuationToken: continuationToken,
      })
    );
    for (const object of response.Contents ?? []) {
      if (!object.Key || object.Key.endsWith('/') || object.Key.endsWith('.json')) {
        continue;
      }
      items.push({
        key: object.Key,
        name: object.Key.slice(normalized.length),
        size: object.Size ?? 0,
        lastModified: object.LastModified ?? new Date(),
      });
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return items.sort((a, b) => a.name.localeCompare(b.name));
};

const countFilesUnderPrefix = async (conn: S3Connection, prefix: string): Promise<number> => {
  let count = 0;
  let continuationToken: string | undefined;
  const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`;

  do {
    const response = await conn.client.send(
      new ListObjectsV2Command({
        Bucket: conn.bucket,
        Prefix: normalized,
        ContinuationToken: continuationToken,
      })
    );
    for (const item of response.Contents ?? []) {
      if (item.Key && !item.Key.endsWith('/') && !item.Key.endsWith('.json')) {
        count += 1;
      }
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return count;
};

export const listSubmissionsForUser = async (
  conn: S3Connection,
  filter: {
    role: UserRole;
    username: string;
  }
): Promise<SubmissionRecord[]> => {
  const keys = await listAllSubmissions(conn);
  const records: SubmissionRecord[] = [];

  for (const key of keys) {
    const record = await getJsonObject<SubmissionRecord>(conn, key);
    if (!record) {
      continue;
    }
    if (filter.role === USER_ROLES.ADMIN) {
      records.push(record);
      continue;
    }
    if (filter.role === USER_ROLES.ANALYST && record.analystUsername === filter.username) {
      records.push(record);
      continue;
    }
    if (filter.role === USER_ROLES.SUPERVISOR && record.supervisorUsername === filter.username) {
      records.push(record);
    }
  }

  return records.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const findEditableSubmissionForProject = async (
  conn: S3Connection,
  analystUsername: string,
  projectId: string
): Promise<SubmissionRecord | null> => {
  const list = await listSubmissionsForUser(conn, {
    role: USER_ROLES.ANALYST,
    username: analystUsername,
  });
  return (
    list.find(
      (s) =>
        s.projectId === projectId &&
        (s.status === SUBMISSION_STATUS.DRAFT || s.status === SUBMISSION_STATUS.REJECTED)
    ) ?? null
  );
};

export const getOrCreateEditableSubmission = async (
  conn: S3Connection,
  params: {
    projectId: string;
    analystUsername: string;
    supervisorUsername: string;
    notes?: string;
  }
): Promise<SubmissionRecord> => {
  const existing = await findEditableSubmissionForProject(
    conn,
    params.analystUsername,
    params.projectId
  );
  if (existing) {
    return existing;
  }
  return createDraftSubmission(conn, params);
};

export const resolveAnalystSubmissionForProject = async (
  conn: S3Connection,
  params: {
    projectId: string;
    analystUsername: string;
    supervisorUsername: string;
  }
): Promise<{ record: SubmissionRecord; canEdit: boolean }> => {
  const list = await listSubmissionsForUser(conn, {
    role: USER_ROLES.ANALYST,
    username: params.analystUsername,
  });
  const forProject = list.filter((s) => s.projectId === params.projectId);

  const pending = forProject.find((s) => s.status === SUBMISSION_STATUS.PENDING_REVIEW);
  if (pending) {
    return { record: pending, canEdit: false };
  }

  const editable = forProject.find(
    (s) =>
      s.status === SUBMISSION_STATUS.DRAFT || s.status === SUBMISSION_STATUS.REJECTED
  );
  if (editable) {
    return { record: editable, canEdit: true };
  }

  const draft = await createDraftSubmission(conn, {
    projectId: params.projectId,
    analystUsername: params.analystUsername,
    supervisorUsername: params.supervisorUsername,
  });
  return { record: draft, canEdit: true };
};

const createSupervisorNotification = async (
  conn: S3Connection,
  submission: SubmissionRecord
): Promise<void> => {
  const notificationId = newNotificationId();
  const notification: WorkflowNotification = {
    id: notificationId,
    submissionId: submission.id,
    projectId: submission.projectId,
    analystUsername: submission.analystUsername,
    supervisorUsername: submission.supervisorUsername,
    message: `El analista ${submission.analystUsername} envió un lote para revisión en el proyecto ${submission.projectId}.`,
    createdAt: new Date().toISOString(),
    read: false,
  };
  await putJsonObject(
    conn,
    notificationMetaKey(submission.supervisorUsername, notificationId),
    notification
  );
};

export const submitForReview = async (
  conn: S3Connection,
  submissionId: string
): Promise<SubmissionRecord> => {
  const record = await getSubmission(conn, submissionId);
  if (!record) {
    throw new Error('Envío no encontrado');
  }
  if (record.status !== SUBMISSION_STATUS.DRAFT && record.status !== SUBMISSION_STATUS.REJECTED) {
    throw new Error('Este envío no puede enviarse a revisión en su estado actual');
  }

  const fileCount = await countFilesUnderPrefix(conn, record.stagingPrefix);
  if (fileCount === 0) {
    throw new Error('Debes subir al menos un archivo antes de enviar a revisión');
  }

  record.fileCount = fileCount;
  record.status = SUBMISSION_STATUS.PENDING_REVIEW;
  record.submittedAt = new Date().toISOString();
  record.rejectReason = null;
  await saveSubmission(conn, record);
  await createSupervisorNotification(conn, record);
  return record;
};

const listAllObjectKeysRecursive = async (
  conn: S3Connection,
  prefix: string
): Promise<string[]> => {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`;

  do {
    const response = await conn.client.send(
      new ListObjectsV2Command({
        Bucket: conn.bucket,
        Prefix: normalized,
        ContinuationToken: continuationToken,
      })
    );
    for (const item of response.Contents ?? []) {
      if (item.Key && !item.Key.endsWith('/')) {
        keys.push(item.Key);
      }
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
};

const copyStagingToApproved = async (
  conn: S3Connection,
  record: SubmissionRecord
): Promise<void> => {
  const sourceKeys = await listAllObjectKeysRecursive(conn, record.stagingPrefix);
  const approvedBase = approvedPrefixForProject(record.projectId);
  const stagingBase = record.stagingPrefix;

  for (const sourceKey of sourceKeys) {
    if (sourceKey.includes('/_workflow/')) {
      continue;
    }
    const relative = sourceKey.slice(stagingBase.length);
    const destinationKey = `${approvedBase}${relative}`;

    await conn.client.send(
      new CopyObjectCommand({
        Bucket: conn.bucket,
        CopySource: `${conn.bucket}/${sourceKey}`,
        Key: destinationKey,
      })
    );
  }
};

const deleteStagingObjects = async (
  conn: S3Connection,
  record: SubmissionRecord
): Promise<void> => {
  const keys = await listAllObjectKeysRecursive(conn, record.stagingPrefix);
  for (const key of keys) {
    await conn.client.send(
      new DeleteObjectCommand({
        Bucket: conn.bucket,
        Key: key,
      })
    );
  }
};

export const approveSubmission = async (
  conn: S3Connection,
  submissionId: string,
  supervisorUsername: string
): Promise<SubmissionRecord> => {
  const record = await getSubmission(conn, submissionId);
  if (!record) {
    throw new Error('Envío no encontrado');
  }
  if (record.supervisorUsername !== supervisorUsername) {
    throw new Error('No tienes permiso para aprobar este envío');
  }
  if (record.status !== SUBMISSION_STATUS.PENDING_REVIEW) {
    throw new Error('Solo se pueden aprobar envíos pendientes de revisión');
  }

  await copyStagingToApproved(conn, record);
  record.status = SUBMISSION_STATUS.APPROVED;
  record.reviewedAt = new Date().toISOString();
  record.reviewedBy = supervisorUsername;
  await saveSubmission(conn, record);
  await deleteStagingObjects(conn, record);
  return record;
};

export const rejectSubmission = async (
  conn: S3Connection,
  submissionId: string,
  supervisorUsername: string,
  rejectReason: string
): Promise<SubmissionRecord> => {
  const record = await getSubmission(conn, submissionId);
  if (!record) {
    throw new Error('Envío no encontrado');
  }
  if (record.supervisorUsername !== supervisorUsername) {
    throw new Error('No tienes permiso para rechazar este envío');
  }
  if (record.status !== SUBMISSION_STATUS.PENDING_REVIEW) {
    throw new Error('Solo se pueden rechazar envíos pendientes de revisión');
  }

  record.status = SUBMISSION_STATUS.REJECTED;
  record.reviewedAt = new Date().toISOString();
  record.reviewedBy = supervisorUsername;
  record.rejectReason = rejectReason.trim() || 'Rechazado sin comentario';
  await saveSubmission(conn, record);
  return record;
};

export const listSupervisorNotifications = async (
  conn: S3Connection,
  supervisorUsername: string
): Promise<WorkflowNotification[]> => {
  const prefix = `${NOTIFICATIONS_META_PREFIX}/${supervisorUsername}/`;
  let continuationToken: string | undefined;
  const items: WorkflowNotification[] = [];

  do {
    const response = await conn.client.send(
      new ListObjectsV2Command({
        Bucket: conn.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const object of response.Contents ?? []) {
      if (!object.Key?.endsWith('.json')) {
        continue;
      }
      const n = await getJsonObject<WorkflowNotification>(conn, object.Key);
      if (n) {
        items.push(n);
      }
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const markNotificationRead = async (
  conn: S3Connection,
  supervisorUsername: string,
  notificationId: string
): Promise<void> => {
  const key = notificationMetaKey(supervisorUsername, notificationId);
  const n = await getJsonObject<WorkflowNotification>(conn, key);
  if (!n) {
    return;
  }
  n.read = true;
  await putJsonObject(conn, key, n);
};
