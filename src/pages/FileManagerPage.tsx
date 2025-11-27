import { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useClipboard } from '../contexts/ClipboardContext';
import { FileList } from '../components/FileManager/FileList';
import { UploadModal } from '../components/FileManager/UploadModal';
import { RenameModal } from '../components/FileManager/RenameModal';
import { CreateFolderModal } from '../components/FileManager/CreateFolderModal';
import {
  listObjects,
  uploadFile,
  downloadFile,
  deleteFile,
  deleteFolder,
  renameFile,
  createFolder,
  copyFile,
  copyFolder,
  moveFile,
  moveFolder,
} from '../services/s3Service';
import type { S3Object } from '../services/s3Service';
import { loadAWSConfig } from '../utils/configLoader';

export function FileManagerPage() {
  const { selectedProject, currentPath, setCurrentPath } = useProject();
  const { clipboard, clipboardOperation, addToClipboard, clearClipboard } = useClipboard();
  const [files, setFiles] = useState<S3Object[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [awsConfig, setAwsConfig] = useState<any>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ key: string; name: string; isFolder: boolean } | null>(null);

  useEffect(() => {
    loadAWSConfig()
      .then(setAwsConfig)
      .catch((err) => {
        console.error('Failed to load AWS config:', err);
        setError(err.message || 'Failed to load AWS configuration. Please check config.json file.');
      });
  }, []);

  useEffect(() => {
    if (selectedProject && awsConfig) {
      loadFiles();
    }
  }, [selectedProject, currentPath, awsConfig]);

  const loadFiles = async () => {
    if (!selectedProject || !awsConfig) return;

    setLoading(true);
    setError('');

    try {
      // Build prefix: project_id_1/ or project_id_1/subfolder/
      const prefix = currentPath 
        ? `${selectedProject}/${currentPath}${currentPath.endsWith('/') ? '' : '/'}`
        : `${selectedProject}/`;
      
      console.log('Loading files with prefix:', prefix);
      const objects = await listObjects(awsConfig, prefix);
      console.log('Loaded objects:', objects.length, objects);
      setFiles(objects);
    } catch (err: any) {
      console.error('Error loading files:', err);
      setError(err.message || 'Failed to load files. Please check your AWS credentials and bucket configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!selectedProject || !awsConfig) return;

    const key = `${selectedProject}/${currentPath}${file.name}`;
    await uploadFile(awsConfig, key, file);
    await loadFiles();
  };

  const handleDownload = async (key: string) => {
    if (!awsConfig) return;

    try {
      const url = await downloadFile(awsConfig, key);
      const link = document.createElement('a');
      link.href = url;
      link.download = key.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to download file');
    }
  };

  const handleDelete = async (key: string, isFolder: boolean) => {
    if (!awsConfig) return;
    if (!confirm(`Are you sure you want to delete this ${isFolder ? 'folder' : 'file'}?`)) return;

    try {
      if (isFolder) {
        await deleteFolder(awsConfig, key);
      } else {
        await deleteFile(awsConfig, key);
      }
      await loadFiles();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleRename = async (newName: string) => {
    if (!selectedItem || !awsConfig || !selectedProject) return;

    try {
      const oldKey = selectedItem.key;
      const pathParts = oldKey.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newKey = pathParts.join('/');

      if (selectedItem.isFolder) {
        // For folders, we need to rename all files inside
        const oldPrefix = oldKey.endsWith('/') ? oldKey : `${oldKey}/`;
        const newPrefix = newKey.endsWith('/') ? newKey : `${newKey}/`;
        await moveFolder(awsConfig, oldPrefix, newPrefix);
      } else {
        await renameFile(awsConfig, oldKey, newKey);
      }
      await loadFiles();
    } catch (err) {
      alert('Failed to rename');
    }
  };

  const handleCopy = (key: string, name: string, isFolder: boolean) => {
    addToClipboard([{ key, name, isFolder }], 'copy');
  };

  const handleMove = (key: string, name: string, isFolder: boolean) => {
    addToClipboard([{ key, name, isFolder }], 'move');
  };

  const handlePaste = async () => {
    if (!clipboard.length || !awsConfig || !selectedProject) return;

    try {
      for (const item of clipboard) {
        const destinationKey = `${selectedProject}/${currentPath}${item.name}`;
        
        if (item.isFolder) {
          if (clipboardOperation === 'copy') {
            await copyFolder(awsConfig, item.key, destinationKey);
          } else {
            await moveFolder(awsConfig, item.key, destinationKey);
          }
        } else {
          if (clipboardOperation === 'copy') {
            await copyFile(awsConfig, item.key, destinationKey);
          } else {
            await moveFile(awsConfig, item.key, destinationKey);
          }
        }
      }
      clearClipboard();
      await loadFiles();
    } catch (err) {
      alert('Failed to paste');
    }
  };

  const handleCreateFolder = async (folderName: string) => {
    if (!selectedProject || !awsConfig) return;

    const key = `${selectedProject}/${currentPath}${folderName}/`;
    await createFolder(awsConfig, key);
    await loadFiles();
  };

  const handleNavigate = (key: string) => {
    if (!selectedProject) return;
    const relativePath = key.replace(`${selectedProject}/`, '');
    setCurrentPath(relativePath);
  };

  const handleNavigateUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length > 0 ? `${parts.join('/')}/` : '');
  };

  if (!selectedProject) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please select a project first</p>
      </div>
    );
  }

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">File Manager</h1>
        <div className="flex space-x-2">
          {clipboard.length > 0 && (
            <button
              onClick={handlePaste}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Paste ({clipboardOperation})
            </button>
          )}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Upload
          </button>
          <button
            onClick={() => setIsCreateFolderModalOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Create Folder
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleNavigateUp}
            disabled={!currentPath}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            ↑ Up
          </button>
          <span className="text-sm text-gray-600">Project: {selectedProject}</span>
          <span className="text-gray-400">/</span>
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              <button
                onClick={() => {
                  const path = breadcrumbs.slice(0, index + 1).join('/') + '/';
                  setCurrentPath(path);
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                {crumb}
              </button>
              {index < breadcrumbs.length - 1 && (
                <span className="text-gray-400 mx-1">/</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <FileList
          items={files}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onRename={(key, name, isFolder) => {
            setSelectedItem({ key, name, isFolder });
            setIsRenameModalOpen(true);
          }}
          onCopy={handleCopy}
          onMove={handleMove}
          onNavigate={handleNavigate}
        />
      )}

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        currentPath={currentPath}
      />

      <RenameModal
        isOpen={isRenameModalOpen}
        onClose={() => {
          setIsRenameModalOpen(false);
          setSelectedItem(null);
        }}
        onRename={handleRename}
        currentName={selectedItem?.name || ''}
        isFolder={selectedItem?.isFolder || false}
      />

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onCreate={handleCreateFolder}
      />
    </div>
  );
}

