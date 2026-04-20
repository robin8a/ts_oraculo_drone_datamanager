import { S3Client } from '@aws-sdk/client-s3';
import type { AWSConfig } from '../types/config';
import type { S3Connection } from '../types/s3';

let s3Client: S3Client | null = null;
let currentConfig: AWSConfig | null = null;

export function getS3Client(config: AWSConfig): S3Client {
  if (
    s3Client &&
    currentConfig &&
    currentConfig.accessKey === config.accessKey &&
    currentConfig.secretKey === config.secretKey &&
    currentConfig.bucket === config.bucket
  ) {
    return s3Client;
  }

  s3Client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  });

  currentConfig = config;
  return s3Client;
}

export const s3ConnectionFromAwsConfig = (config: AWSConfig): S3Connection => ({
  bucket: config.bucket,
  client: getS3Client(config),
});

