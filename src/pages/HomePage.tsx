import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROLE_LABELS, USER_ROLES } from '../constants/roles';
import {
  canAccessAdminPanel,
  canAccessFileManager,
  canAccessSupervisorInbox,
  usesStagingFileManager,
} from '../utils/permissions';
import { NoRoleBanner } from '../components/NoRoleBanner';

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role;

  const accessDenied = (location.state as { accessDenied?: string } | null)?.accessDenied;

  return (
    <div className="space-y-6">
      {!role && <NoRoleBanner />}

      {accessDenied === 'wrong_role' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          No tienes permiso para abrir esa sección con tu rol actual (
          {role ? ROLE_LABELS[role] : 'sin rol'}).
        </div>
      )}

      <section className="brand-card overflow-hidden p-8">
        <p className="brand-kicker">Terrasacha</p>
        <h1 className="brand-page-title mt-4">Centro documental de proyectos</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-terra-deep/80">
          Tu acceso depende del atributo <strong>custom:role</strong> en Cognito. Cada rol tiene
          acciones limitadas en la aplicación.
        </p>
        {role && (
          <p className="mt-4 text-sm font-medium text-terra-primary">
            Tu rol: {ROLE_LABELS[role]}
          </p>
        )}
        {role && (
          <div className="mt-8 flex flex-wrap gap-3">
            {canAccessFileManager(role) && (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className="brand-button-secondary px-6 py-3"
                >
                  {usesStagingFileManager(role) ? 'Mis proyectos' : 'Proyectos'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/files')}
                  className={
                    usesStagingFileManager(role)
                      ? 'brand-button-primary px-6 py-3'
                      : 'brand-button-secondary px-6 py-3'
                  }
                >
                  {usesStagingFileManager(role) ? 'Subir archivos' : 'Archivos avalados'}
                </button>
              </>
            )}
            {canAccessSupervisorInbox(role) && (
              <button
                type="button"
                onClick={() => navigate('/supervisor')}
                className="brand-button-primary px-6 py-3"
              >
                Bandeja de revisión
              </button>
            )}
            {canAccessAdminPanel(role) && (
              <button
                type="button"
                onClick={() => navigate('/admin/users')}
                className="brand-button-secondary px-6 py-3"
              >
                Administrar usuarios
              </button>
            )}
          </div>
        )}
      </section>

      {role && (
        <section className="brand-card p-6">
          <p className="brand-kicker">Permisos de tu rol</p>
          <ul className="mt-3 list-disc pl-5 text-sm leading-7 text-terra-deep/80 space-y-1">
            {role === USER_ROLES.ANALYST && (
              <>
                <li>Subir y organizar archivos en /files (zona staging, jerarquía territorial)</li>
                <li>Enviar el lote a revisión; el supervisor lo avala en su bandeja</li>
                <li>Tras la aprobación, los archivos pasan a approved/ (no antes)</li>
                <li>No puedes ver la documentación ya avalada de otros</li>
              </>
            )}
            {role === USER_ROLES.SUPERVISOR && (
              <>
                <li>Recibir notificaciones cuando un analista envía un lote</li>
                <li>Aprobar o rechazar envíos</li>
                <li>Consultar y descargar archivos en zona approved (sin editarlos)</li>
              </>
            )}
            {role === USER_ROLES.ADMIN && (
              <>
                <li>Acceso a todas las secciones (staging, revisión, archivos, administración)</li>
                <li>Gestionar usuarios y asignar custom:role</li>
                <li>Editar, borrar y organizar archivos en approved y el resto del bucket (según IAM)</li>
              </>
            )}
          </ul>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="brand-panel p-6">
          <p className="brand-kicker">Usuario</p>
          <h2 className="mt-3 text-2xl font-semibold text-terra-deep">
            Hola, {user?.username}
          </h2>
          <p className="mt-3 text-sm leading-6 text-terra-deep/75">
            {user?.supervisor_id
              ? `Supervisor: ${user.supervisor_id}`
              : 'Sesión activa en Terrasacha.'}
          </p>
        </article>
        <article className="brand-panel p-6">
          <p className="brand-kicker">Proyectos</p>
          <h2 className="mt-3 text-3xl font-semibold text-terra-deep">
            {user?.project_ids.length || 0}
          </h2>
        </article>
        <article className="brand-panel p-6">
          <p className="brand-kicker">Flujo</p>
          <h2 className="mt-3 text-xl font-semibold text-terra-deep">staging → approved</h2>
        </article>
      </section>
    </div>
  );
}
