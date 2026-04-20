import { S3Client } from '@aws-sdk/client-s3';
import { fetchAuthSession } from 'aws-amplify/auth';
import amplifyConfig from '../amplifyconfiguration.json';
import type { S3Connection } from '../types/s3';

/**
 * S3 con credenciales temporales del Identity Pool (usuario Cognito autenticado).
 * Usar en /files: llamadas directas al API de S3 desde el navegador.
 */
export const getCognitoDirectS3Connection = async (): Promise<S3Connection | null> => {
  const session = await fetchAuthSession();
  const c = session.credentials;
  if (!c?.accessKeyId || !c?.secretAccessKey) {
    return null;
  }

  const bucket = amplifyConfig.aws_user_files_s3_bucket;
  const region =
    amplifyConfig.aws_user_files_s3_bucket_region ||
    amplifyConfig.aws_cognito_region ||
    'us-east-1';

  if (!bucket) {
    return null;
  }

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId: c.accessKeyId,
      secretAccessKey: c.secretAccessKey,
      sessionToken: c.sessionToken,
    },
  });

  return { bucket, client };
};
