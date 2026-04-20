import type { S3Client } from '@aws-sdk/client-s3';

/** Cliente S3 del SDK + bucket (credenciales vía Cognito Identity Pool o config estática). */
export type S3Connection = {
  bucket: string;
  client: S3Client;
};
