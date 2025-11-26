import type { S3Object } from '../../services/s3Service';
import { FileItem } from './FileItem';

interface FileListProps {
  items: S3Object[];
  onDownload: (key: string) => void;
  onDelete: (key: string, isFolder: boolean) => void;
  onRename: (key: string, name: string, isFolder: boolean) => void;
  onCopy: (key: string, name: string, isFolder: boolean) => void;
  onMove: (key: string, name: string, isFolder: boolean) => void;
  onNavigate: (key: string) => void;
}

export function FileList({
  items,
  onDownload,
  onDelete,
  onRename,
  onCopy,
  onMove,
  onNavigate,
}: FileListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No files or folders found
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="divide-y divide-gray-200">
        {items.map((item) => (
          <FileItem
            key={item.key}
            item={item}
            onDownload={onDownload}
            onDelete={onDelete}
            onRename={onRename}
            onCopy={onCopy}
            onMove={onMove}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

