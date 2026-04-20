import {
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { S3Connection } from '../types/s3';

export type { S3Connection } from '../types/s3';
export { s3ConnectionFromAwsConfig } from '../utils/s3Client';

export interface S3Object {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  isFolder: boolean;
}

export async function listObjects(conn: S3Connection, prefix: string): Promise<S3Object[]> {
  const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;

  const command = new ListObjectsV2Command({
    Bucket: conn.bucket,
    Prefix: normalizedPrefix,
    Delimiter: '/',
  });

  try {
    const response = await conn.client.send(command);

    const objects: S3Object[] = [];

    if (response.CommonPrefixes) {
      for (const commonPrefix of response.CommonPrefixes) {
        if (commonPrefix.Prefix) {
          const name = commonPrefix.Prefix.replace(normalizedPrefix, '').replace('/', '');
          if (name) {
            objects.push({
              key: commonPrefix.Prefix,
              name,
              size: 0,
              lastModified: new Date(),
              isFolder: true,
            });
          }
        }
      }
    }

    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key && object.Key !== normalizedPrefix) {
          const name = object.Key.replace(normalizedPrefix, '');
          if (name && !name.endsWith('/')) {
            objects.push({
              key: object.Key,
              name,
              size: object.Size || 0,
              lastModified: object.LastModified || new Date(),
              isFolder: false,
            });
          }
        }
      }
    }

    return objects;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to list objects from S3';
    throw new Error(errorMessage);
  }
}

export async function uploadFile(conn: S3Connection, key: string, file: File): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: conn.bucket,
    Key: key,
    Body: uint8Array,
    ContentType: file.type,
  });

  await conn.client.send(command);
}

export async function downloadFile(conn: S3Connection, key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: conn.bucket,
    Key: key,
  });

  return getSignedUrl(conn.client, command, { expiresIn: 3600 });
}

export async function getImageUrl(conn: S3Connection, key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: conn.bucket,
    Key: key,
  });

  return getSignedUrl(conn.client, command, { expiresIn: 3600 });
}

export const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.tif'];
  const lowerFilename = filename.toLowerCase();
  return imageExtensions.some((ext) => lowerFilename.endsWith(ext));
};

export async function deleteFile(conn: S3Connection, key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: conn.bucket,
    Key: key,
  });

  await conn.client.send(command);
}

export async function deleteFolder(conn: S3Connection, prefix: string): Promise<void> {
  const objects = await listObjects(conn, prefix);

  for (const obj of objects) {
    if (!obj.isFolder) {
      await deleteFile(conn, obj.key);
    } else {
      await deleteFolder(conn, obj.key);
    }
  }

  try {
    await deleteFile(conn, prefix);
  } catch {
    // Folder marker might not exist
  }
}

export async function copyFile(conn: S3Connection, sourceKey: string, destinationKey: string): Promise<void> {
  const command = new CopyObjectCommand({
    Bucket: conn.bucket,
    CopySource: `${conn.bucket}/${sourceKey}`,
    Key: destinationKey,
  });

  await conn.client.send(command);
}

export async function moveFile(conn: S3Connection, sourceKey: string, destinationKey: string): Promise<void> {
  await copyFile(conn, sourceKey, destinationKey);
  await deleteFile(conn, sourceKey);
}

export async function renameFile(conn: S3Connection, oldKey: string, newKey: string): Promise<void> {
  await moveFile(conn, oldKey, newKey);
}

export async function createFolder(conn: S3Connection, key: string): Promise<void> {
  const folderKey = key.endsWith('/') ? key : `${key}/`;

  const command = new PutObjectCommand({
    Bucket: conn.bucket,
    Key: folderKey,
    Body: '',
  });

  await conn.client.send(command);
}

export async function copyFolder(conn: S3Connection, sourcePrefix: string, destinationPrefix: string): Promise<void> {
  const objects = await listObjects(conn, sourcePrefix);

  for (const obj of objects) {
    const relativePath = obj.key.replace(sourcePrefix, '');
    const newKey = `${destinationPrefix}${relativePath}`;

    if (obj.isFolder) {
      await createFolder(conn, newKey);
      await copyFolder(conn, obj.key, newKey);
    } else {
      await copyFile(conn, obj.key, newKey);
    }
  }
}

export async function moveFolder(conn: S3Connection, sourcePrefix: string, destinationPrefix: string): Promise<void> {
  await copyFolder(conn, sourcePrefix, destinationPrefix);
  await deleteFolder(conn, sourcePrefix);
}
