import type { S3Connection, S3Object } from '../../services/s3Service';
import { FileItem } from './FileItem';

interface FileListProps {
  s3Connection: S3Connection;
  items: S3Object[];
  onDownload: (key: string) => void;
  onDelete: (key: string, isFolder: boolean) => void;
  onRename: (key: string, name: string, isFolder: boolean) => void;
  onCopy: (key: string, name: string, isFolder: boolean) => void;
  onMove: (key: string, name: string, isFolder: boolean) => void;
  onNavigate: (key: string) => void;
  onPreview?: (key: string) => void;
}

export function FileList({
  s3Connection,
  items,
  onDownload,
  onDelete,
  onRename,
  onCopy,
  onMove,
  onNavigate,
  onPreview,
}: FileListProps) {
  if (items.length === 0) {
    return (
      <div className="brand-card py-12 text-center text-terra-deep/70">
        No se encontraron archivos ni carpetas
      </div>
    );
  }

  return (
    <div className="brand-card overflow-hidden">
      <div className="divide-y divide-terra-moss/20">
        {items.map((item) => (
          <FileItem
            key={item.key}
            s3Connection={s3Connection}
            item={item}
            onDownload={onDownload}
            onDelete={onDelete}
            onRename={onRename}
            onCopy={onCopy}
            onMove={onMove}
            onNavigate={onNavigate}
            onPreview={onPreview}
          />
        ))}
      </div>
    </div>
  );
}

