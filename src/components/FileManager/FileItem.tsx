import type { S3Object } from '../../services/s3Service';

interface FileItemProps {
  item: S3Object;
  onDownload: (key: string) => void;
  onDelete: (key: string, isFolder: boolean) => void;
  onRename: (key: string, name: string, isFolder: boolean) => void;
  onCopy: (key: string, name: string, isFolder: boolean) => void;
  onMove: (key: string, name: string, isFolder: boolean) => void;
  onNavigate: (key: string) => void;
}

export function FileItem({
  item,
  onDownload,
  onDelete,
  onRename,
  onCopy,
  onMove,
  onNavigate,
}: FileItemProps) {
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

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50">
      <div className="flex items-center space-x-4 flex-1">
        {item.isFolder ? (
          <button
            onClick={() => onNavigate(item.key)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
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
          <div className="flex items-center space-x-2">
            <svg
              className="w-6 h-6 text-gray-400"
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
            <span>{item.name}</span>
          </div>
        )}
        <span className="text-sm text-gray-500">
          {item.isFolder ? 'Folder' : formatSize(item.size)}
        </span>
        <span className="text-sm text-gray-500">{formatDate(item.lastModified)}</span>
      </div>
      <div className="flex items-center space-x-2">
        {!item.isFolder && (
          <button
            onClick={() => onDownload(item.key)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            title="Download"
          >
            Download
          </button>
        )}
        <button
          onClick={() => onCopy(item.key, item.name, item.isFolder)}
          className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
          title="Copy"
        >
          Copy
        </button>
        <button
          onClick={() => onMove(item.key, item.name, item.isFolder)}
          className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
          title="Move"
        >
          Move
        </button>
        <button
          onClick={() => onRename(item.key, item.name, item.isFolder)}
          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          title="Rename"
        >
          Rename
        </button>
        <button
          onClick={() => onDelete(item.key, item.isFolder)}
          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          title="Delete"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

