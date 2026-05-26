import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminRole, ROLE_LABELS, USER_ROLES } from '../../constants/roles';
import {
  canAccessAdminPanel,
  canAccessFileManager,
  canAccessSupervisorInbox,
  usesStagingFileManager,
} from '../../utils/permissions';

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const getNavClassName = (path: string) =>
    `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
      isActive(path)
        ? 'bg-terra-sand text-terra-deep shadow-soft'
        : 'text-white/80 hover:bg-white/10 hover:text-white'
    }`;

  const role = user?.role ?? null;
  const isAdmin = isAdminRole(role);

  return (
    <aside className="hidden min-h-full w-72 border-r border-terra-moss/15 bg-terra-deep/95 px-5 py-6 text-white lg:block">
      <div className="mb-8 border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-terra-sand/80">Navegación</p>
        <h2 className="mt-3 font-display text-2xl font-bold tracking-wide text-terra-sand">
          Terrasacha
        </h2>
        <p className="mt-2 text-sm text-white/65">
          {isAdmin
            ? 'Acceso completo (administrador).'
            : 'Plataforma documental con roles y aval de supervisores.'}
        </p>
        {role ? (
          <p className="mt-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-terra-sand">
            {ROLE_LABELS[role]}
          </p>
        ) : (
          <p className="mt-3 text-xs text-amber-200">Sin custom:role</p>
        )}
      </div>
      <nav className="space-y-2">
        <Link to="/home" className={getNavClassName('/home')}>
          Inicio
        </Link>
        {(isAdmin || (role && canAccessSupervisorInbox(role))) && (
          <Link to="/supervisor" className={getNavClassName('/supervisor')}>
            Revisión (supervisor)
          </Link>
        )}
        {(isAdmin || (role && canAccessFileManager(role))) && (
          <>
            <Link to="/projects" className={getNavClassName('/projects')}>
              {role === USER_ROLES.ANALYST ? 'Mis proyectos' : 'Proyectos'}
            </Link>
            <Link to="/files" className={getNavClassName('/files')}>
              {role && usesStagingFileManager(role) ? 'Subir archivos' : 'Archivos avalados'}
            </Link>
          </>
        )}
        {(isAdmin || (role && canAccessAdminPanel(role))) && (
          <Link to="/admin/users" className={getNavClassName('/admin/users')}>
            Administración
          </Link>
        )}
      </nav>
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-terra-sand/80">Flujo</p>
        <p className="mt-2 text-sm leading-6 text-white/75">
          staging → revisión → approved
        </p>
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-6 w-full rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
      >
        Cerrar sesión
      </button>
    </aside>
  );
}
