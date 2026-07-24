import { ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import type { S3Connection } from '../types/s3';
import type { ProjectRecord } from '../types/project';
import { PROJECT_STATUS } from '../types/project';
import {
  PROJECTS_META_PREFIX,
  approvedPrefixForProject,
  projectFolderPrefix,
  stagingRootForProject,
} from '../constants/workflowStorage';

/** Slug normalizado en minúsculas (validación de entrada). */
export const PROJECT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const normalizeProjectId = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Nombre de carpeta en S3: siempre MAYÚSCULAS (como SAGAMI). */
export const toS3ProjectFolderName = (raw: string): string =>
  normalizeProjectId(raw).toUpperCase();

export const validateProjectId = (id: string): string | null => {
  const normalized = normalizeProjectId(id);
  if (!normalized) {
    return 'El identificador es obligatorio';
  }
  if (normalized.length < 2 || normalized.length > 64) {
    return 'El identificador debe tener entre 2 y 64 caracteres';
  }
  if (!PROJECT_ID_PATTERN.test(normalized)) {
    return 'Usa solo letras, números y guiones (ej. sagami o proyecto-meta-2026)';
  }
  return null;
};

const projectsRootPrefix = (): string =>
  PROJECTS_META_PREFIX.endsWith('/') ? PROJECTS_META_PREFIX : `${PROJECTS_META_PREFIX}/`;

const synthesizeFolderProject = (folderName: string): ProjectRecord => {
  const now = new Date().toISOString();
  return {
    id: folderName,
    name: folderName,
    description: null,
    status: PROJECT_STATUS.ACTIVE,
    createdAt: now,
    createdBy: 's3-folder',
    updatedAt: now,
  };
};

const putFolderMarker = async (conn: S3Connection, prefix: string): Promise<void> => {
  const key = prefix.endsWith('/') ? prefix : `${prefix}/`;
  await conn.client.send(
    new PutObjectCommand({
      Bucket: conn.bucket,
      Key: key,
      Body: '',
    })
  );
};

/** Crea `_approved/` y `_staging/` dentro del proyecto si no existen. */
export const ensureProjectZoneFolders = async (
  conn: S3Connection,
  projectId: string
): Promise<void> => {
  await putFolderMarker(conn, projectFolderPrefix(projectId));
  await putFolderMarker(conn, approvedPrefixForProject(projectId));
  await putFolderMarker(conn, stagingRootForProject(projectId));
};

const folderExists = async (conn: S3Connection, prefix: string): Promise<boolean> => {
  const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`;
  const response = await conn.client.send(
    new ListObjectsV2Command({
      Bucket: conn.bucket,
      Prefix: normalized,
      MaxKeys: 1,
    })
  );
  return (response.KeyCount ?? 0) > 0 || (response.Contents?.length ?? 0) > 0;
};

/**
 * Lista proyectos = carpetas en `public/_projects/`
 * (ignora archivos sueltos; no usa meta.json).
 */
export const listProjects = async (conn: S3Connection): Promise<ProjectRecord[]> => {
  const prefix = projectsRootPrefix();
  const byId = new Map<string, ProjectRecord>();
  let continuationToken: string | undefined;

  do {
    const response = await conn.client.send(
      new ListObjectsV2Command({
        Bucket: conn.bucket,
        Prefix: prefix,
        Delimiter: '/',
        ContinuationToken: continuationToken,
      })
    );

    for (const common of response.CommonPrefixes ?? []) {
      const folderPrefix = common.Prefix;
      if (!folderPrefix || !folderPrefix.startsWith(prefix)) {
        continue;
      }
      const folderName = folderPrefix.slice(prefix.length).replace(/\/$/, '');
      if (!folderName || folderName.includes('/') || folderName.startsWith('_')) {
        continue;
      }
      byId.set(folderName.toUpperCase(), synthesizeFolderProject(folderName));
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
};

export const getProject = async (
  conn: S3Connection,
  projectId: string
): Promise<ProjectRecord | null> => {
  const id = projectId.toUpperCase();
  if (await folderExists(conn, projectFolderPrefix(id))) {
    return synthesizeFolderProject(id);
  }
  return null;
};

export const createProject = async (
  conn: S3Connection,
  params: {
    id: string;
    name: string;
    description?: string;
    createdBy: string;
  }
): Promise<ProjectRecord> => {
  const idError = validateProjectId(params.id);
  if (idError) {
    throw new Error(idError);
  }

  const id = toS3ProjectFolderName(params.id);
  const name = params.name.trim() || id;
  if (!name) {
    throw new Error('El nombre del proyecto es obligatorio');
  }

  const existing = await getProject(conn, id);
  if (existing) {
    throw new Error(`Ya existe un proyecto con el id "${id}"`);
  }

  await ensureProjectZoneFolders(conn, id);

  const now = new Date().toISOString();
  return {
    id,
    name: name.toUpperCase() === id ? id : name,
    description: params.description?.trim() || null,
    status: PROJECT_STATUS.ACTIVE,
    createdAt: now,
    createdBy: params.createdBy,
    updatedAt: now,
  };
};
