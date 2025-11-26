import { S3Client } from '@aws-sdk/client-s3';
import type { AWSConfig } from '../types/config';

let s3Client: S3Client | null = null;
let currentConfig: AWSConfig | null = null;

export function getS3Client(config: AWSConfig): S3Client {
  if (s3Client && currentConfig && 
      currentConfig.accessKey === config.accessKey &&
      currentConfig.secretKey === config.secretKey &&
      currentConfig.bucket === config.bucket) {
    return s3Client;
  }

  s3Client = new S3Client({
    region: 'us-east-1', // Default region, can be configured
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  });

  currentConfig = config;
  return s3Client;
}

