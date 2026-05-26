import { useCallback, useEffect, useState } from 'react';
import type { S3Connection } from '../types/s3';
import { downloadFile, isImageFile } from '../services/s3Service';
import { listSubmissionStagingFiles } from '../services/submissionWorkflowService';
import type { StagingFileItem } from '../services/submissionWorkflowService';
import { ImagePreviewModal } from './FileManager/ImagePreviewModal';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface SubmissionStagingFileListProps {
  s3Conn: S3Connection;
  stagingPrefix: string;
}

export const SubmissionStagingFileList = ({
  s3Conn,
  stagingPrefix,
}: SubmissionStagingFileListProps) => {
  const [files, setFiles] = useState<StagingFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ key: string; name: string } | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await listSubmissionStagingFiles(s3Conn, stagingPrefix);
      setFiles(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los archivos');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [s3Conn, stagingPrefix]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const handleDownload = async (file: StagingFileItem) => {
    try {
      const url = await downloadFile(s3Conn, file.key);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('No se pudo abrir el archivo');
    }
  };

  if (loading) {
    return <p className="text-sm text-terra-deep/70 py-2">Cargando archivos del envío…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-red-700 py-2" role="alert">
        {error}
      </p>
    );
  }

  if (files.length === 0) {
    return (
      <p className="text-sm text-terra-deep/70 py-2 rounded-2xl border border-dashed border-terra-moss/30 bg-terra-cream/40 px-4">
        Este envío no tiene archivos en staging.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-terra-moss/15 rounded-2xl border border-terra-moss/20 bg-white/70 overflow-hidden">
        {files.map((file) => (
          <li
            key={file.key}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-terra-cream/40"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-terra-deep truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-terra-deep/60">
                {formatFileSize(file.size)} · {file.lastModified.toLocaleString()}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {isImageFile(file.name) ? (
                <button
                  type="button"
                  className="brand-button-secondary text-xs py-1.5 px-3"
                  onClick={() => setPreview({ key: file.key, name: file.name })}
                >
                  Ver
                </button>
              ) : null}
              <button
                type="button"
                className="brand-button-ghost text-xs py-1.5 px-3 underline-offset-2 hover:underline"
                onClick={() => void handleDownload(file)}
              >
                Abrir
              </button>
            </div>
          </li>
        ))}
      </ul>

      {preview ? (
        <ImagePreviewModal
          s3Connection={s3Conn}
          isOpen
          imageKey={preview.key}
          imageName={preview.name}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </>
  );
};
