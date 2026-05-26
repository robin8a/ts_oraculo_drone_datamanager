import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getCognitoDirectS3Connection } from '../utils/cognitoS3Connection';
import type { S3Connection } from '../types/s3';

export const useS3Connection = () => {
  const { isAuthenticated } = useAuth();
  const [s3Conn, setS3Conn] = useState<S3Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setS3Conn(null);
      setLoading(false);
      setError('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    getCognitoDirectS3Connection()
      .then((conn) => {
        if (cancelled) {
          return;
        }
        setS3Conn(conn);
        if (!conn) {
          setError(
            'No hay credenciales S3. Revisa Identity Pool y permisos sobre staging, approved y _workflow.'
          );
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al conectar con S3');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return { s3Conn, loading, error };
};
