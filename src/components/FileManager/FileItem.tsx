import { useState, useEffect } from 'react';
import type { S3Connection, S3Object } from '../../services/s3Service';
import { isImageFile, getImageUrl } from '../../services/s3Service';
import type { RolePermissions } from '../../utils/permissions';

interface FileItemProps {
  s3Connection: S3Connection;
  item: S3Object;
  permissions: RolePermissions;
  onDownload: (key: string) => void;
  onDelete: (key: string, isFolder: boolean) => void;
  onRename: (key: string, name: string, isFolder: boolean) => void;
  onCopy: (key: string, name: string, isFolder: boolean) => void;
  onMove: (key: string, name: string, isFolder: boolean) => void;
  onNavigate: (key: string) => void;
  onPreview?: (key: string) => void;
}

export function FileItem({
  s3Connection,
  item,
  permissions,
  onDownload,
  onDelete,
  onRename,
  onCopy,
  onMove,
  onNavigate,
  onPreview,
}: FileItemProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const isImage = !item.isFolder && isImageFile(item.name);

  useEffect(() => {
    if (isImage && permissions.previewImages) {
      setImageLoading(true);
      getImageUrl(s3Connection, item.key)
        .then((url) => {
          setImageUrl(url);
          setImageLoading(false);
        })
        .catch(() => {
          setImageLoading(false);
        });
    }
  }, [isImage, item.key, s3Connection, permissions.previewImages]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const handleImageClick = () => {
    if (onPreview && isImage && permissions.previewImages) {
      onPreview(item.key);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 transition hover:bg-terra-cream/60 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 items-center gap-4">
        {item.isFolder ? (
          <button
            type="button"
            onClick={() => onNavigate(item.key)}
            className="flex items-center gap-2 text-terra-primary transition hover:text-terra-deep"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <span className="font-medium">{item.name}</span>
          </button>
        ) : (
          <div className="flex flex-1 items-center gap-4">
            {isImage && permissions.previewImages ? (
              <div className="flex items-center gap-3">
                {imageLoading ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-terra-cream">
                    <svg className="h-6 w-6 animate-spin text-terra-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : imageUrl ? (
                  <button
                    type="button"
                    onClick={handleImageClick}
                    className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-terra-moss/45 transition hover:border-terra-primary"
                    title="Haz clic para previsualizar"
                  >
                    <img
                      src={imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={() => setImageUrl(null)}
                    />
                  </button>
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-terra-cream">
                    <svg className="h-8 w-8 text-terra-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <span className="font-medium">{item.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg
                  className="h-6 w-6 text-terra-moss"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-terra-deep">{item.name}</span>
              </div>
            )}
          </div>
        )}
        <div className="ml-auto flex flex-col gap-1 text-sm text-terra-deep/65 lg:min-w-44">
          <span>{item.isFolder ? 'Carpeta' : formatSize(item.size)}</span>
          <span>{formatDate(item.lastModified)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!item.isFolder && (
          <>
            {isImage && onPreview && permissions.previewImages && (
              <button
                type="button"
                onClick={handleImageClick}
                className="brand-button-secondary px-3 py-2 text-sm"
                title="Vista previa"
              >
                Vista previa
              </button>
            )}
            {permissions.downloadFiles && (
              <button
                type="button"
                onClick={() => onDownload(item.key)}
                className="brand-button-primary px-3 py-2 text-sm"
                title="Descargar"
              >
                Descargar
              </button>
            )}
          </>
        )}
        {permissions.copyMoveFiles && (
          <>
            <button
              type="button"
              onClick={() => onCopy(item.key, item.name, item.isFolder)}
              className="brand-button-secondary px-3 py-2 text-sm"
              title="Copiar"
            >
              Copiar
            </button>
            <button
              type="button"
              onClick={() => onMove(item.key, item.name, item.isFolder)}
              className="rounded-xl bg-terra-sand px-3 py-2 text-sm font-medium text-terra-deep transition hover:bg-[#ddcb87]"
              title="Mover"
            >
              Mover
            </button>
          </>
        )}
        {permissions.renameFiles && (
          <button
            type="button"
            onClick={() => onRename(item.key, item.name, item.isFolder)}
            className="rounded-xl bg-terra-meadow px-3 py-2 text-sm font-medium text-white transition hover:bg-terra-primary"
            title="Renombrar"
          >
            Renombrar
          </button>
        )}
        {permissions.deleteFiles && (
          <button
            type="button"
            onClick={() => onDelete(item.key, item.isFolder)}
            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            title="Eliminar"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
