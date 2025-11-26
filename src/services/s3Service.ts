import {
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AWSConfig } from '../types/config';
import { getS3Client } from '../utils/s3Client';

export interface S3Object {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  isFolder: boolean;
}

export async function listObjects(
  config: AWSConfig,
  prefix: string
): Promise<S3Object[]> {
  const client = getS3Client(config);
  const command = new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: prefix,
    Delimiter: '/',
  });

  try {
    const response = await client.send(command);
    const objects: S3Object[] = [];

    // Add folders (CommonPrefixes)
    if (response.CommonPrefixes) {
      for (const commonPrefix of response.CommonPrefixes) {
        if (commonPrefix.Prefix) {
          const name = commonPrefix.Prefix.replace(prefix, '').replace('/', '');
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

    // Add files
    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key && object.Key !== prefix) {
          const name = object.Key.replace(prefix, '');
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

    return objects;
  } catch (error) {
    console.error('Error listing objects:', error);
    throw error;
  }
}

export async function uploadFile(
  config: AWSConfig,
  key: string,
  file: File
): Promise<void> {
  const client = getS3Client(config);
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: uint8Array,
    ContentType: file.type,
  });

  try {
    await client.send(command);
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

export async function downloadFile(
  config: AWSConfig,
  key: string
): Promise<string> {
  const client = getS3Client(config);
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  try {
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });
    return url;
  } catch (error) {
    console.error('Error generating download URL:', error);
    throw error;
  }
}

export async function deleteFile(
  config: AWSConfig,
  key: string
): Promise<void> {
  const client = getS3Client(config);
  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  try {
    await client.send(command);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

export async function deleteFolder(
  config: AWSConfig,
  prefix: string
): Promise<void> {
  // List all objects with this prefix
  const objects = await listObjects(config, prefix);
  
  // Delete all objects in the folder
  for (const obj of objects) {
    if (!obj.isFolder) {
      await deleteFile(config, obj.key);
    } else {
      // Recursively delete subfolders
      await deleteFolder(config, obj.key);
    }
  }
  
  // Delete the folder marker if it exists
  try {
    await deleteFile(config, prefix);
  } catch (error) {
    // Folder marker might not exist, which is fine
  }
}

export async function copyFile(
  config: AWSConfig,
  sourceKey: string,
  destinationKey: string
): Promise<void> {
  const client = getS3Client(config);
  const command = new CopyObjectCommand({
    Bucket: config.bucket,
    CopySource: `${config.bucket}/${sourceKey}`,
    Key: destinationKey,
  });

  try {
    await client.send(command);
  } catch (error) {
    console.error('Error copying file:', error);
    throw error;
  }
}

export async function moveFile(
  config: AWSConfig,
  sourceKey: string,
  destinationKey: string
): Promise<void> {
  await copyFile(config, sourceKey, destinationKey);
  await deleteFile(config, sourceKey);
}

export async function renameFile(
  config: AWSConfig,
  oldKey: string,
  newKey: string
): Promise<void> {
  await moveFile(config, oldKey, newKey);
}

export async function createFolder(
  config: AWSConfig,
  key: string
): Promise<void> {
  const client = getS3Client(config);
  // Ensure the key ends with a slash
  const folderKey = key.endsWith('/') ? key : `${key}/`;
  
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: folderKey,
    Body: '',
  });

  try {
    await client.send(command);
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

export async function copyFolder(
  config: AWSConfig,
  sourcePrefix: string,
  destinationPrefix: string
): Promise<void> {
  const objects = await listObjects(config, sourcePrefix);
  
  for (const obj of objects) {
    const relativePath = obj.key.replace(sourcePrefix, '');
    const newKey = `${destinationPrefix}${relativePath}`;
    
    if (obj.isFolder) {
      await createFolder(config, newKey);
      await copyFolder(config, obj.key, newKey);
    } else {
      await copyFile(config, obj.key, newKey);
    }
  }
}

export async function moveFolder(
  config: AWSConfig,
  sourcePrefix: string,
  destinationPrefix: string
): Promise<void> {
  await copyFolder(config, sourcePrefix, destinationPrefix);
  await deleteFolder(config, sourcePrefix);
}

