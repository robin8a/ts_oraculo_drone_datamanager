import {
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
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
import { pathUnderStorageRoot } from '../constants/storageRoot';

const newSubmissionId = (): string =>
  `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const newNotificationId = (): string =>
  `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const isPendingLikeSubmission = (record: SubmissionRecord): boolean => {
  if (record.status === SUBMISSION_STATUS.PENDING_REVIEW) {
    return true;
  }
  return Boolean(
    record.submittedAt &&
      !record.reviewedAt &&
      record.status !== SUBMISSION_STATUS.APPROVED &&
      record.status !== SUBMISSION_STATUS.REJECTED
  );
};

const normalizePrefix = (prefix: string): string =>
  prefix.endsWith('/') ? prefix : `${prefix}/`;

const hasAnyObjectUnderPrefix = async (conn: S3Connection, prefix: string): Promise<boolean> => {
  const response = await conn.client.send(
    new ListObjectsV2Command({
      Bucket: conn.bucket,
      Prefix: normalizePrefix(prefix),
      MaxKeys: 1,
    })
  );
  return (response.KeyCount ?? 0) > 0;
};

const listFolderPrefixes = async (conn: S3Connection, prefix: string): Promise<string[]> => {
  const response = await conn.client.send(
    new ListObjectsV2Command({
      Bucket: conn.bucket,
      Prefix: normalizePrefix(prefix),
      Delimiter: '/',
    })
  );
  return (response.CommonPrefixes ?? [])
    .map((item) => item.Prefix)
    .filter((value): value is string => Boolean(value));
};

const createFolderMarker = async (conn: S3Connection, prefix: string): Promise<void> => {
  await conn.client.send(
    new PutObjectCommand({
      Bucket: conn.bucket,
      Key: normalizePrefix(prefix),
      Body: '',
    })
  );
};

const copyFolderTreeSkeleton = async (
  conn: S3Connection,
  sourcePrefix: string,
  targetPrefix: string
): Promise<void> => {
  const source = normalizePrefix(sourcePrefix);
  const target = normalizePrefix(targetPrefix);
  const stack: Array<{ source: string; target: string }> = [{ source, target }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    const children = await listFolderPrefixes(conn, current.source);
    for (const childSource of children) {
      const relative = childSource.slice(current.source.length);
      const childTarget = `${current.target}${relative}`;
      await createFolderMarker(conn, childTarget);
      stack.push({ source: childSource, target: childTarget });
    }
  }
};

const seedAnalystStagingFoldersIfEmpty = async (
  conn: S3Connection,
  record: SubmissionRecord
): Promise<void> => {
  if (await hasAnyObjectUnderPrefix(conn, record.stagingPrefix)) {
    return;
  }

  const approvedPrefix = approvedPrefixForProject(record.projectId);
  const legacyProjectPrefix = `${pathUnderStorageRoot(record.projectId)}/`;
  const sourceCandidates = [approvedPrefix, legacyProjectPrefix];

  for (const sourcePrefix of sourceCandidates) {
    if (!(await hasAnyObjectUnderPrefix(conn, sourcePrefix))) {
      continue;
    }
    await copyFolderTreeSkeleton(conn, sourcePrefix, record.stagingPrefix);
    return;
  }
};

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
  const rankStatus = (status: SubmissionRecord['status']): number => {
    if (status === SUBMISSION_STATUS.APPROVED) return 4;
    if (status === SUBMISSION_STATUS.PENDING_REVIEW) return 3;
    if (status === SUBMISSION_STATUS.REJECTED) return 2;
    if (status === SUBMISSION_STATUS.DRAFT) return 1;
    return 0;
  };

  const pickBetterRecord = (a: SubmissionRecord, b: SubmissionRecord): SubmissionRecord => {
    const rankA = rankStatus(a.status);
    const rankB = rankStatus(b.status);
    if (rankA !== rankB) {
      return rankA > rankB ? a : b;
    }
    const submittedA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const submittedB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    if (submittedA !== submittedB) {
      return submittedA > submittedB ? a : b;
    }
    const reviewedA = a.reviewedAt ? new Date(a.reviewedAt).getTime() : 0;
    const reviewedB = b.reviewedAt ? new Date(b.reviewedAt).getTime() : 0;
    if (reviewedA !== reviewedB) {
      return reviewedA > reviewedB ? a : b;
    }
    return new Date(a.createdAt).getTime() >= new Date(b.createdAt).getTime() ? a : b;
  };

  const keys = await listAllSubmissions(conn);
  const bySubmissionId = new Map<string, SubmissionRecord>();

  for (const key of keys) {
    const record = await getJsonObject<SubmissionRecord>(conn, key);
    if (!record) {
      continue;
    }
    const existing = bySubmissionId.get(record.id);
    if (existing) {
      const chosen = pickBetterRecord(existing, record);
      bySubmissionId.set(record.id, chosen);
      continue;
    }
    bySubmissionId.set(record.id, record);
  }

  const records: SubmissionRecord[] = [];
  for (const record of bySubmissionId.values()) {
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
): Promise<{
  record: SubmissionRecord;
  canEdit: boolean;
  pendingReviewRecords: SubmissionRecord[];
}> => {
  const list = await listSubmissionsForUser(conn, {
    role: USER_ROLES.ANALYST,
    username: params.analystUsername,
  });
  const forProject = list.filter((s) => s.projectId === params.projectId);

  const pendingList = forProject.filter((s) => isPendingLikeSubmission(s));
  for (const pending of pendingList) {
    if (pending.status === SUBMISSION_STATUS.PENDING_REVIEW) {
      continue;
    }
    pending.status = SUBMISSION_STATUS.PENDING_REVIEW;
    await saveSubmission(conn, pending);
  }
  if (pendingList.length > 0) {
    const editableWhilePending = forProject.find(
      (s) =>
        !pendingList.some((pending) => pending.id === s.id) &&
        (s.status === SUBMISSION_STATUS.DRAFT || s.status === SUBMISSION_STATUS.REJECTED)
    );
    if (editableWhilePending) {
      await seedAnalystStagingFoldersIfEmpty(conn, editableWhilePending);
      return {
        record: editableWhilePending,
        canEdit: true,
        pendingReviewRecords: pendingList,
      };
    }

    const draftWhilePending = await createDraftSubmission(conn, {
      projectId: params.projectId,
      analystUsername: params.analystUsername,
      supervisorUsername: params.supervisorUsername,
    });
    await seedAnalystStagingFoldersIfEmpty(conn, draftWhilePending);
    return {
      record: draftWhilePending,
      canEdit: true,
      pendingReviewRecords: pendingList,
    };
  }

  const editable = forProject.find(
    (s) =>
      s.status === SUBMISSION_STATUS.DRAFT || s.status === SUBMISSION_STATUS.REJECTED
  );
  if (editable) {
    await seedAnalystStagingFoldersIfEmpty(conn, editable);
    return { record: editable, canEdit: true, pendingReviewRecords: [] };
  }

  const draft = await createDraftSubmission(conn, {
    projectId: params.projectId,
    analystUsername: params.analystUsername,
    supervisorUsername: params.supervisorUsername,
  });
  await seedAnalystStagingFoldersIfEmpty(conn, draft);
  return { record: draft, canEdit: true, pendingReviewRecords: [] };
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

const ensurePendingForSupervisorAction = (record: SubmissionRecord): void => {
  if (
    record.status !== SUBMISSION_STATUS.PENDING_REVIEW &&
    !(record.submittedAt && !record.reviewedAt)
  ) {
    throw new Error('Solo se pueden revisar archivos de envíos pendientes');
  }
};

const ensureSubmissionAccess = (
  record: SubmissionRecord,
  supervisorUsername: string
): void => {
  if (record.supervisorUsername !== supervisorUsername) {
    throw new Error('No tienes permiso para revisar este envío');
  }
};

const ensureFileInsideSubmission = (fileKey: string, stagingPrefix: string): void => {
  const normalized = stagingPrefix.endsWith('/') ? stagingPrefix : `${stagingPrefix}/`;
  if (!fileKey.startsWith(normalized) || fileKey.endsWith('/')) {
    throw new Error('Archivo inválido para este envío');
  }
};

export const approveSubmissionFile = async (
  conn: S3Connection,
  submissionId: string,
  supervisorUsername: string,
  fileKey: string
): Promise<SubmissionRecord> => {
  const record = await getSubmission(conn, submissionId);
  if (!record) {
    throw new Error('Envío no encontrado');
  }
  ensureSubmissionAccess(record, supervisorUsername);
  ensurePendingForSupervisorAction(record);
  ensureFileInsideSubmission(fileKey, record.stagingPrefix);

  const approvedBase = approvedPrefixForProject(record.projectId);
  const relative = fileKey.slice(record.stagingPrefix.length);
  const destinationKey = `${approvedBase}${relative}`;

  await conn.client.send(
    new CopyObjectCommand({
      Bucket: conn.bucket,
      CopySource: `${conn.bucket}/${fileKey}`,
      Key: destinationKey,
    })
  );
  await conn.client.send(
    new DeleteObjectCommand({
      Bucket: conn.bucket,
      Key: fileKey,
    })
  );

  record.fileCount = await countFilesUnderPrefix(conn, record.stagingPrefix);
  await saveSubmission(conn, record);
  return record;
};

export const rejectSubmissionFile = async (
  conn: S3Connection,
  submissionId: string,
  supervisorUsername: string,
  fileKey: string
): Promise<SubmissionRecord> => {
  const record = await getSubmission(conn, submissionId);
  if (!record) {
    throw new Error('Envío no encontrado');
  }
  ensureSubmissionAccess(record, supervisorUsername);
  ensurePendingForSupervisorAction(record);
  ensureFileInsideSubmission(fileKey, record.stagingPrefix);

  await conn.client.send(
    new DeleteObjectCommand({
      Bucket: conn.bucket,
      Key: fileKey,
    })
  );

  record.fileCount = await countFilesUnderPrefix(conn, record.stagingPrefix);
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

export const deleteNotification = async (
  conn: S3Connection,
  supervisorUsername: string,
  notificationId: string
): Promise<void> => {
  const key = notificationMetaKey(supervisorUsername, notificationId);
  await conn.client.send(
    new DeleteObjectCommand({
      Bucket: conn.bucket,
      Key: key,
    })
  );
};
