import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import type { S3Connection } from '../types/s3';
import { SUBMISSIONS_META_PREFIX } from '../constants/workflowStorage';

const readBodyAsString = async (body: unknown): Promise<string> => {
  if (!body) {
    return '';
  }
  if (typeof body === 'string') {
    return body;
  }
  if (body instanceof Uint8Array) {
    return new TextDecoder().decode(body);
  }
  if (typeof (body as { transformToString?: () => Promise<string> }).transformToString === 'function') {
    return (body as { transformToString: () => Promise<string> }).transformToString();
  }
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const merged = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder().decode(merged);
};

export const putJsonObject = async (
  conn: S3Connection,
  key: string,
  data: unknown
): Promise<void> => {
  const body = JSON.stringify(data, null, 2);
  await conn.client.send(
    new PutObjectCommand({
      Bucket: conn.bucket,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      CacheControl: 'no-store, max-age=0, must-revalidate',
    })
  );
};

export const getJsonObject = async <T>(conn: S3Connection, key: string): Promise<T | null> => {
  try {
    const response = await conn.client.send(
      new GetObjectCommand({
        Bucket: conn.bucket,
        Key: key,
        ResponseCacheControl: 'no-store, max-age=0, must-revalidate',
      })
    );
    const text = await readBodyAsString(response.Body);
    if (!text) {
      return null;
    }
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

export const listJsonKeysUnderPrefix = async (
  conn: S3Connection,
  prefix: string
): Promise<string[]> => {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await conn.client.send(
      new ListObjectsV2Command({
        Bucket: conn.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const item of response.Contents ?? []) {
      if (item.Key?.endsWith('.json')) {
        keys.push(item.Key);
      }
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
};

export const listAllSubmissions = async (conn: S3Connection): Promise<string[]> =>
  listJsonKeysUnderPrefix(conn, `${SUBMISSIONS_META_PREFIX}/`);
