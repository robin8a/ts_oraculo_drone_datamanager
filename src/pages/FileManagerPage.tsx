import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { SUBMISSION_STATUS } from '../constants/workflowStorage';
import type { SubmissionRecord } from '../types/workflow';
import { useClipboard } from '../contexts/ClipboardContext';
import { FileList } from '../components/FileManager/FileList';
import { UploadModal } from '../components/FileManager/UploadModal';
import { RenameModal } from '../components/FileManager/RenameModal';
import { CreateFolderModal } from '../components/FileManager/CreateFolderModal';
import { ImagePreviewModal } from '../components/FileManager/ImagePreviewModal';
import { isImageFile, getImageUrl } from '../services/s3Service';
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
import type { S3Connection, S3Object } from '../services/s3Service';
import { getCognitoDirectS3Connection } from '../utils/cognitoS3Connection';
import { GEO_HIERARCHY_LEVEL_LABELS, getGeoLevelLabel } from '../constants/geoHierarchy';
import {
  approvedProjectRootPrefixInS3,
  listPrefixForApprovedProjectPath,
  listPrefixForStagingSubmissionPath,
  objectKeyInApprovedProjectPath,
  objectKeyInStagingSubmissionPath,
  stagingSubmissionRootPrefix,
} from '../constants/s3StoragePrefix';
import { APPROVED_ROOT, STAGING_ROOT } from '../constants/workflowStorage';
import { useRolePermissions } from '../hooks/useRolePermissions';
import type { RolePermissions } from '../utils/permissions';
import { usesStagingFileManager } from '../utils/permissions';
import {
  resolveAnalystSubmissionForProject,
  submitForReview,
} from '../services/submissionWorkflowService';

type ImageThumbnailProps = {
  s3Connection: S3Connection;
  item: S3Object;
  permissions: RolePermissions;
  onPreview: (key: string) => void;
  onDownload: (key: string) => void;
};

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  PENDING_REVIEW: 'En revisión',
  REJECTED: 'Rechazado',
};

export function FileManagerPage() {
  const { isAuthenticated, user } = useAuth();
  const permissions = useRolePermissions();
  const isAnalystMode = usesStagingFileManager(user?.role ?? null);
  const { selectedProject, currentPath, setCurrentPath } = useProject();
  const { clipboard, clipboardOperation, addToClipboard, clearClipboard } = useClipboard();
  const [files, setFiles] = useState<S3Object[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [s3Conn, setS3Conn] = useState<S3Connection | null>(null);
  const [s3InitLoading, setS3InitLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ key: string; name: string; isFolder: boolean } | null>(null);
  const [previewImageKey, setPreviewImageKey] = useState<string>('');
  const [previewImageName, setPreviewImageName] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'gallery'>('list');
  const [filterImagesOnly, setFilterImagesOnly] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<SubmissionRecord | null>(null);
  const [canEditStaging, setCanEditStaging] = useState(false);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [workflowMessage, setWorkflowMessage] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const effectivePermissions = useMemo((): RolePermissions => {
    if (!isAnalystMode || canEditStaging) {
      return permissions;
    }
    return {
      ...permissions,
      manageStagingFiles: false,
      deleteFiles: false,
      renameFiles: false,
      copyMoveFiles: false,
      createFolders: false,
    };
  }, [isAnalystMode, canEditStaging, permissions]);

  const canUpload =
    permissions.manageApprovedFiles ||
    (isAnalystMode && canEditStaging && permissions.manageStagingFiles);

  const canCreateFolders =
    permissions.createFolders &&
    (!isAnalystMode || (canEditStaging && permissions.manageStagingFiles));

  useEffect(() => {
    if (!isAuthenticated) {
      setS3Conn(null);
      setS3InitLoading(false);
      return;
    }
    let cancelled = false;
    setS3InitLoading(true);
    setError('');
    getCognitoDirectS3Connection()
      .then((conn) => {
        if (cancelled) {
          return;
        }
        setS3Conn(conn);
        if (!conn) {
          setError(
            'No hay credenciales temporales de S3 (Identity Pool). Inicia sesión de nuevo o revisa la configuración de Amplify/Cognito.'
          );
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo conectar con S3.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setS3InitLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const loadAnalystSubmission = useCallback(async () => {
    if (!isAnalystMode || !s3Conn || !selectedProject || !user) {
      return;
    }
    if (!user.supervisor_id) {
      setSubmissionError(
        'No tienes supervisor asignado. Pide al administrador que configure custom:supervisor_id.'
      );
      setActiveSubmission(null);
      setCanEditStaging(false);
      return;
    }

    setSubmissionLoading(true);
    setSubmissionError('');
    try {
      const { record, canEdit } = await resolveAnalystSubmissionForProject(s3Conn, {
        projectId: selectedProject,
        analystUsername: user.username,
        supervisorUsername: user.supervisor_id,
      });
      setActiveSubmission(record);
      setCanEditStaging(canEdit);
    } catch (err: unknown) {
      setSubmissionError(
        err instanceof Error ? err.message : 'No se pudo preparar el envío en staging'
      );
      setActiveSubmission(null);
      setCanEditStaging(false);
    } finally {
      setSubmissionLoading(false);
    }
  }, [isAnalystMode, s3Conn, selectedProject, user]);

  useEffect(() => {
    if (isAnalystMode && s3Conn && selectedProject) {
      void loadAnalystSubmission();
    }
  }, [isAnalystMode, s3Conn, selectedProject, loadAnalystSubmission]);

  useEffect(() => {
    setCurrentPath('');
  }, [selectedProject, activeSubmission?.id, setCurrentPath]);

  const loadFiles = useCallback(async () => {
    if (!selectedProject || !s3Conn) {
      return;
    }
    if (isAnalystMode && !activeSubmission) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const prefix = isAnalystMode
        ? listPrefixForStagingSubmissionPath(activeSubmission!.stagingPrefix, currentPath)
        : listPrefixForApprovedProjectPath(selectedProject, currentPath);
      const objects = await listObjects(s3Conn, prefix);
      setFiles(objects);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los archivos. Revisa credenciales y permisos S3.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedProject, s3Conn, isAnalystMode, activeSubmission, currentPath]);

  useEffect(() => {
    if (selectedProject && s3Conn) {
      if (!isAnalystMode || activeSubmission) {
        void loadFiles();
      }
    }
  }, [selectedProject, currentPath, s3Conn, isAnalystMode, activeSubmission, loadFiles]);

  const buildObjectKey = (name: string, isFolder: boolean): string => {
    if (!selectedProject) {
      throw new Error('Sin proyecto seleccionado');
    }
    if (isAnalystMode && activeSubmission) {
      return objectKeyInStagingSubmissionPath(
        activeSubmission.stagingPrefix,
        currentPath,
        name,
        isFolder
      );
    }
    return objectKeyInApprovedProjectPath(selectedProject, currentPath, name, isFolder);
  };

  const handleUpload = async (file: File) => {
    if (!selectedProject || !s3Conn) {
      return;
    }
    if (isAnalystMode && !canEditStaging) {
      return;
    }

    const key = buildObjectKey(file.name, false);
    await uploadFile(s3Conn, key, file);
    await loadFiles();
  };

  const handleSubmitForReview = async () => {
    if (!s3Conn || !activeSubmission || !canEditStaging) {
      return;
    }
    setSubmittingReview(true);
    setWorkflowMessage('');
    setError('');
    try {
      const updated = await submitForReview(s3Conn, activeSubmission.id);
      setActiveSubmission(updated);
      setCanEditStaging(false);
      setWorkflowMessage('Envío enviado a revisión. Tu supervisor lo verá en su bandeja.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar a revisión');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDownload = async (key: string) => {
    if (!s3Conn) return;

    try {
      const url = await downloadFile(s3Conn, key);
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
    if (!s3Conn) return;
    if (!confirm(`Are you sure you want to delete this ${isFolder ? 'folder' : 'file'}?`)) return;

    try {
      if (isFolder) {
        await deleteFolder(s3Conn, key);
      } else {
        await deleteFile(s3Conn, key);
      }
      await loadFiles();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleRename = async (newName: string) => {
    if (!selectedItem || !s3Conn || !selectedProject) return;

    try {
      const oldKey = selectedItem.key;
      const pathParts = oldKey.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newKey = pathParts.join('/');

      if (selectedItem.isFolder) {
        // For folders, we need to rename all files inside
        const oldPrefix = oldKey.endsWith('/') ? oldKey : `${oldKey}/`;
        const newPrefix = newKey.endsWith('/') ? newKey : `${newKey}/`;
        await moveFolder(s3Conn, oldPrefix, newPrefix);
      } else {
        await renameFile(s3Conn, oldKey, newKey);
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
    if (!clipboard.length || !s3Conn || !selectedProject) {
      return;
    }

    try {
      for (const item of clipboard) {
        const destinationKey = buildObjectKey(item.name, item.isFolder);

        if (item.isFolder) {
          if (clipboardOperation === 'copy') {
            await copyFolder(s3Conn, item.key, destinationKey);
          } else {
            await moveFolder(s3Conn, item.key, destinationKey);
          }
        } else {
          if (clipboardOperation === 'copy') {
            await copyFile(s3Conn, item.key, destinationKey);
          } else {
            await moveFile(s3Conn, item.key, destinationKey);
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
    if (!selectedProject || !s3Conn) {
      return;
    }
    if (isAnalystMode && !canEditStaging) {
      return;
    }

    const key = buildObjectKey(folderName, true);
    await createFolder(s3Conn, key);
    await loadFiles();
  };

  const handleNavigate = (key: string) => {
    if (!selectedProject) {
      return;
    }
    const base = isAnalystMode && activeSubmission
      ? stagingSubmissionRootPrefix(activeSubmission.stagingPrefix)
      : approvedProjectRootPrefixInS3(selectedProject);
    const relativePath = key.replace(base, '');
    setCurrentPath(relativePath);
  };

  const handleNavigateUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length > 0 ? `${parts.join('/')}/` : '');
  };

  const handlePreview = (key: string) => {
    const item = files.find((f) => f.key === key);
    if (item && !item.isFolder) {
      setPreviewImageKey(key);
      setPreviewImageName(item.name);
      setIsImagePreviewOpen(true);
    }
  };

  const filteredFiles = filterImagesOnly
    ? files.filter((file) => !file.isFolder && isImageFile(file.name))
    : files;

  if (!selectedProject) {
    return (
      <div className="brand-card py-12 text-center">
        <p className="text-terra-deep/70">Selecciona primero un proyecto</p>
      </div>
    );
  }

  if (s3InitLoading) {
    return (
      <div className="brand-card py-12 text-center">
        <p className="text-terra-deep/70">Conectando con S3 (credenciales de tu sesión)…</p>
      </div>
    );
  }

  if (!s3Conn) {
    return (
      <div className="brand-card py-12 text-center space-y-3">
        <p className="text-terra-deep/80">
          No se pudo abrir S3 con credenciales temporales del Identity Pool. Revisa que el usuario autenticado tenga rol
          con permisos sobre el bucket configurado en Amplify.
        </p>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    );
  }

  if (isAnalystMode && submissionLoading) {
    return (
      <div className="brand-card py-12 text-center text-terra-deep/70">
        Preparando tu espacio de trabajo en staging…
      </div>
    );
  }

  if (isAnalystMode && submissionError) {
    return (
      <div className="brand-card py-12 text-center space-y-3">
        <p className="text-red-700">{submissionError}</p>
      </div>
    );
  }

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="brand-card flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="brand-kicker">Gestor documental</p>
          <h1 className="brand-page-title mt-3 text-3xl">
            {isAnalystMode ? 'Subir documentación' : 'Archivos del proyecto'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-terra-deep/75">
            Las rutas siguen la jerarquía territorial:{' '}
            <span className="font-medium text-terra-deep">
              {GEO_HIERARCHY_LEVEL_LABELS.join(' → ')}
            </span>
            . Debajo del árbol puedes añadir carpetas de vuelo u otros datos (por ejemplo{' '}
            <code className="rounded bg-terra-cream px-1 py-0.5 text-xs">vuelo_de_drone_001</code>
            ).
            {isAnalystMode ? (
              <>
                {' '}
                Los archivos se guardan en{' '}
                <code className="rounded bg-terra-cream px-1 py-0.5 text-xs">{STAGING_ROOT}/</code>{' '}
                y solo pasan a{' '}
                <code className="rounded bg-terra-cream px-1 py-0.5 text-xs">{APPROVED_ROOT}/</code>{' '}
                cuando tu supervisor aprueba el envío.
              </>
            ) : (
              <>
                {' '}
                Solo se muestra documentación ya avalada, bajo{' '}
                <code className="rounded bg-terra-cream px-1 py-0.5 text-xs">{APPROVED_ROOT}/</code>.
                {permissions.manageApprovedFiles
                  ? ' Puedes gestionar archivos (administrador).'
                  : ' Modo consulta: descargar y previsualizar (supervisor).'}
              </>
            )}
          </p>
          {isAnalystMode && activeSubmission ? (
            <p className="mt-2 text-sm font-medium text-terra-primary">
              Estado del envío:{' '}
              {SUBMISSION_STATUS_LABELS[activeSubmission.status] ?? activeSubmission.status}
              {activeSubmission.status === SUBMISSION_STATUS.REJECTED && activeSubmission.rejectReason
                ? ` — ${activeSubmission.rejectReason}`
                : ''}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 rounded-2xl border border-terra-moss/30 bg-terra-cream/70 px-4 py-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={filterImagesOnly}
                onChange={(e) => setFilterImagesOnly(e.target.checked)}
                className="h-4 w-4 rounded border-terra-moss text-terra-primary focus:ring-terra-primary"
              />
              <span className="text-sm text-terra-deep">Solo imágenes</span>
            </label>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-terra-moss/30 bg-white/70 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-xl px-3 py-2 transition ${
                viewMode === 'list'
                  ? 'bg-terra-primary text-white'
                  : 'text-terra-deep hover:bg-terra-sand/40'
              }`}
              title="Vista de lista"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('gallery')}
              className={`rounded-xl px-3 py-2 transition ${
                viewMode === 'gallery'
                  ? 'bg-terra-primary text-white'
                  : 'text-terra-deep hover:bg-terra-sand/40'
              }`}
              title="Vista de galería"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
          {effectivePermissions.copyMoveFiles && clipboard.length > 0 && (
            <button
              onClick={handlePaste}
              className="rounded-xl bg-terra-meadow px-4 py-2 font-medium text-white transition hover:bg-terra-primary"
            >
              Pegar ({clipboardOperation})
            </button>
          )}
          {canUpload && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="brand-button-primary"
            >
              Subir archivo
            </button>
          )}
          {isAnalystMode && canEditStaging && permissions.submitForReview && (
            <button
              type="button"
              disabled={submittingReview}
              onClick={() => void handleSubmitForReview()}
              className="brand-button-secondary"
            >
              {submittingReview ? 'Enviando…' : 'Enviar a revisión'}
            </button>
          )}
          {canCreateFolders && (
            <button
              onClick={() => setIsCreateFolderModalOpen(true)}
              className="brand-button-secondary"
            >
              Crear carpeta
            </button>
          )}
        </div>
      </div>
      </div>

      {workflowMessage ? (
        <div className="rounded-2xl border border-terra-moss/30 bg-terra-moss/10 px-4 py-3 text-sm text-terra-deep">
          {workflowMessage}
        </div>
      ) : null}

      {isAnalystMode && activeSubmission?.status === SUBMISSION_STATUS.PENDING_REVIEW ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Este envío está en revisión. Puedes consultar los archivos, pero no modificarlos hasta que
          tu supervisor apruebe o rechace.
        </div>
      ) : null}

      <div className="brand-panel p-4">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          <button
            onClick={handleNavigateUp}
            disabled={!currentPath}
            className="brand-button-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ↑ Subir
          </button>
          <span className="text-sm text-terra-deep/70">Proyecto: {selectedProject}</span>
          <span className="text-terra-moss">/</span>
          {breadcrumbs.length === 0 && (
            <span className="text-xs text-terra-deep/55" title="Crea la primera carpeta (código de país)">
              raíz territorial
            </span>
          )}
          {breadcrumbs.map((crumb, index) => (
            <div key={`${crumb}-${index}`} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  const path = breadcrumbs.slice(0, index + 1).join('/') + '/';
                  setCurrentPath(path);
                }}
                className="rounded-xl px-2 py-1 text-left text-terra-primary transition hover:bg-terra-sand/50 hover:text-terra-deep"
                title={`${getGeoLevelLabel(index)}: ${crumb}`}
              >
                <span className="block text-[10px] font-medium uppercase tracking-wide text-terra-moss/90">
                  {getGeoLevelLabel(index)}
                </span>
                <span className="block text-sm font-semibold">{crumb}</span>
              </button>
              {index < breadcrumbs.length - 1 && (
                <span className="mx-1 text-terra-moss">/</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="brand-card py-12 text-center text-terra-deep/70">Cargando...</div>
      ) : viewMode === 'gallery' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredFiles.map((item) => {
            if (item.isFolder) {
              return (
                <div
                  key={item.key}
                  onClick={() => handleNavigate(item.key)}
                  className="brand-card cursor-pointer border-2 border-terra-moss/30 p-4 transition hover:-translate-y-0.5 hover:border-terra-primary"
                >
                  <div className="flex flex-col items-center justify-center h-32">
                    <svg className="mb-2 h-12 w-12 text-terra-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="w-full truncate text-center text-sm font-medium text-terra-deep">{item.name}</span>
                  </div>
                </div>
              );
            }
            const isImage = isImageFile(item.name);
            return (
              <div
                key={item.key}
                className="brand-card overflow-hidden transition hover:-translate-y-0.5"
              >
                {isImage ? (
                  <ImageThumbnail
                    s3Connection={s3Conn}
                    item={item}
                    permissions={effectivePermissions}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                  />
                ) : (
                  <div className="p-4">
                    <div className="flex flex-col items-center justify-center h-32">
                      <svg className="mb-2 h-12 w-12 text-terra-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="w-full truncate text-center text-xs text-terra-deep/75">{item.name}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <FileList
          s3Connection={s3Conn}
          items={filteredFiles}
          permissions={effectivePermissions}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onRename={(key, name, isFolder) => {
            setSelectedItem({ key, name, isFolder });
            setIsRenameModalOpen(true);
          }}
          onCopy={handleCopy}
          onMove={handleMove}
          onNavigate={handleNavigate}
          onPreview={handlePreview}
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
        nextLevelLabel={getGeoLevelLabel(breadcrumbs.length)}
      />

      <ImagePreviewModal
        s3Connection={s3Conn}
        isOpen={isImagePreviewOpen}
        onClose={() => {
          setIsImagePreviewOpen(false);
          setPreviewImageKey('');
          setPreviewImageName('');
        }}
        imageKey={previewImageKey}
        imageName={previewImageName}
      />
    </div>
  );
}

const ImageThumbnail = (props: ImageThumbnailProps) => {
  const { s3Connection, item, permissions, onPreview, onDownload } = props;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getImageUrl(s3Connection, item.key)
      .then((url) => {
        setImageUrl(url);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [s3Connection, item.key]);

  return (
    <div className="group relative">
      <div className="flex aspect-square items-center justify-center overflow-hidden bg-terra-cream">
        {loading ? (
          <svg className="h-8 w-8 animate-spin text-terra-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            className={`h-full w-full object-cover transition-opacity ${
              permissions.previewImages ? 'cursor-pointer hover:opacity-90' : ''
            }`}
            onClick={() => {
              if (permissions.previewImages) {
                onPreview(item.key);
              }
            }}
          />
        ) : (
          <svg className="h-12 w-12 text-terra-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      {(permissions.previewImages || permissions.downloadFiles) && (
        <div className="absolute inset-0 flex items-center justify-center bg-terra-deep/0 opacity-0 transition-all group-hover:bg-terra-deep/55 group-hover:opacity-100">
          <div className="flex space-x-2">
            {permissions.previewImages && (
              <button
                type="button"
                onClick={() => onPreview(item.key)}
                className="brand-button-secondary px-3 py-1 text-sm"
              >
                Ver
              </button>
            )}
            {permissions.downloadFiles && (
              <button
                type="button"
                onClick={() => onDownload(item.key)}
                className="brand-button-primary px-3 py-1 text-sm"
              >
                Descargar
              </button>
            )}
          </div>
        </div>
      )}
      <div className="p-2">
        <p className="truncate text-xs text-terra-deep/70" title={item.name}>
          {item.name}
        </p>
      </div>
    </div>
  );
};

