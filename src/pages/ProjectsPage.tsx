import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { useS3Connection } from '../hooks/useS3Connection';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { canAccessFileManager } from '../utils/permissions';
import type { ProjectRecord } from '../types/project';
import {
  createProject,
  ensureProjectZoneFolders,
  listProjects,
  normalizeProjectId,
  toS3ProjectFolderName,
} from '../services/projectCatalogService';
import { PROJECT_APPROVED_FOLDER, PROJECT_STAGING_FOLDER } from '../constants/workflowStorage';

export function ProjectsPage() {
  const { user } = useAuth();
  const permissions = useRolePermissions();
  const { selectedProject, setSelectedProject } = useProject();
  const { s3Conn, loading: s3Loading, error: s3Error } = useS3Connection();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const refreshProjects = useCallback(async () => {
    if (!s3Conn) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const list = await listProjects(s3Conn);
      setProjects(list);
    } catch (err: unknown) {
      setProjects([]);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los proyectos');
    } finally {
      setLoading(false);
    }
  }, [s3Conn]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const handleSelectProject = async (projectId: string) => {
    if (s3Conn) {
      try {
        await ensureProjectZoneFolders(s3Conn, projectId);
      } catch {
        // Si faltan permisos Put, igual se puede abrir en lectura
      }
    }
    setSelectedProject(projectId);
    if (user && canAccessFileManager(user.role)) {
      navigate('/files');
    }
  };

  const handleOpenCreate = () => {
    setFormId('');
    setFormName('');
    setFormDescription('');
    setMessage('');
    setError('');
    setIsCreateOpen(true);
  };

  const handleCloseCreate = () => {
    if (creating) {
      return;
    }
    setIsCreateOpen(false);
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!s3Conn || !user || !permissions.manageProjects) {
      return;
    }
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const created = await createProject(s3Conn, {
        id: formId,
        name: formName,
        description: formDescription,
        createdBy: user.username,
      });
      setMessage(`Proyecto "${created.name}" creado.`);
      setIsCreateOpen(false);
      setFormId('');
      setFormName('');
      setFormDescription('');
      await refreshProjects();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el proyecto');
    } finally {
      setCreating(false);
    }
  };

  if (s3Loading) {
    return (
      <div className="brand-card py-12 text-center text-terra-deep/70">
        Conectando con S3…
      </div>
    );
  }

  if (!s3Conn) {
    return (
      <div className="brand-card py-12 text-center space-y-3">
        <p className="text-terra-deep/80">
          No hay conexión S3. Inicia sesión de nuevo o revisa el Identity Pool.
        </p>
        {s3Error ? <p className="text-sm text-red-700">{s3Error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="brand-kicker">Portafolio</p>
          <h1 className="brand-page-title mt-3">Proyectos disponibles</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-terra-deep/75">
            Catálogo en{' '}
            <code className="rounded bg-terra-cream px-1 py-0.5 text-xs">public/_projects/</code>.
            Al abrir un proyecto trabajas en staging o en archivos ya avalados según tu rol.
          </p>
        </div>
        {permissions.manageProjects ? (
          <button type="button" onClick={handleOpenCreate} className="brand-button-primary">
            Crear proyecto
          </button>
        ) : null}
      </section>

      {message ? (
        <div className="rounded-2xl border border-terra-moss/30 bg-terra-moss/10 px-4 py-3 text-sm text-terra-deep">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isCreateOpen && permissions.manageProjects ? (
        <section className="brand-card p-6 md:p-8">
          <h2 className="text-lg font-semibold text-terra-deep">Nuevo proyecto</h2>
          <p className="mt-2 text-sm text-terra-deep/70">
            En S3 se crea{' '}
            <code className="text-xs">public/_projects/&#123;ID&#125;/</code> en mayúsculas, con las
            carpetas <code className="text-xs">{PROJECT_APPROVED_FOLDER}/</code> y{' '}
            <code className="text-xs">{PROJECT_STAGING_FOLDER}/</code> (sin meta.json).
          </p>
          <form onSubmit={(e) => void handleCreateSubmit(e)} className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="brand-label" htmlFor="project-name">
                Nombre
              </label>
              <input
                id="project-name"
                required
                className="brand-input"
                value={formName}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormName(name);
                  if (!formId || formId === normalizeProjectId(formName)) {
                    setFormId(normalizeProjectId(name));
                  }
                }}
                placeholder="Proyecto Meta 2026"
              />
            </div>
            <div>
              <label className="brand-label" htmlFor="project-id">
                Identificador (slug)
              </label>
              <input
                id="project-id"
                required
                className="brand-input font-mono text-sm uppercase"
                value={formId}
                onChange={(e) => setFormId(normalizeProjectId(e.target.value))}
                placeholder="sagami"
              />
              <p className="mt-1 text-xs text-terra-deep/60">
                En S3 quedará:{' '}
                <code>_projects/{formId ? toS3ProjectFolderName(formId) : '…'}/</code>
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="brand-label" htmlFor="project-description">
                Descripción (opcional)
              </label>
              <textarea
                id="project-description"
                className="brand-input min-h-[80px]"
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button type="submit" disabled={creating} className="brand-button-primary">
                {creating ? 'Creando…' : 'Guardar proyecto'}
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={handleCloseCreate}
                className="brand-button-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="brand-card p-6 md:p-8">
        {loading ? (
          <p className="py-8 text-center text-terra-deep/70">Cargando proyectos…</p>
        ) : projects.length > 0 ? (
          <div className="grid gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                aria-label={`Abrir proyecto ${project.name}`}
                className={`cursor-pointer rounded-[1.25rem] border p-5 transition ${
                  selectedProject === project.id
                    ? 'border-terra-primary bg-terra-sand/30 shadow-soft'
                    : 'border-terra-moss/30 bg-white/70 hover:border-terra-primary/40 hover:bg-terra-cream/70'
                }`}
                onClick={() => void handleSelectProject(project.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleSelectProject(project.id);
                  }
                }}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="brand-kicker">Proyecto</p>
                    <span className="mt-3 block text-lg font-semibold text-terra-deep">
                      {project.name}
                    </span>
                    <p className="mt-1 font-mono text-xs text-terra-deep/55">{project.id}</p>
                    {project.description ? (
                      <p className="mt-2 text-sm text-terra-deep/70">{project.description}</p>
                    ) : (
                      <p className="mt-2 text-sm text-terra-deep/70">
                        Espacio documental listo para staging y archivos avalados.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleSelectProject(project.id);
                    }}
                    className="brand-button-primary min-w-28"
                  >
                    Abrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-terra-deep/70">
              No hay proyectos en{' '}
              <code className="text-xs">public/_projects/</code>.
            </p>
            {permissions.manageProjects ? (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="brand-button-primary mt-4"
              >
                Crear el primero
              </button>
            ) : (
              <p className="mt-2 text-sm text-terra-deep/60">
                Pide a un administrador que cree un proyecto.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
