import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ROLE_LABELS, USER_ROLES } from '../constants/roles';
import {
  createAdminUser,
  isWorkflowApiConfigured,
  listSupervisors,
  listUsers,
} from '../services/workflowApiClient';
import type { AdminUserSummary, CreateUserPayload, SupervisorOption } from '../types/workflow';
import { PasswordInput } from '../components/PasswordInput';
import {
  UserCreatedSuccessModal,
  type UserCreatedSuccessDetails,
} from '../components/UserCreatedSuccessModal';

const emptyForm: CreateUserPayload = {
  username: '',
  email: '',
  temporaryPassword: '',
  role: USER_ROLES.ANALYST,
  supervisorId: '',
  projectIds: [],
};

const USER_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmado',
  FORCE_CHANGE_PASSWORD: 'Debe cambiar contraseña',
  UNCONFIRMED: 'Sin confirmar',
  RESET_REQUIRED: 'Requiere reinicio',
  ARCHIVED: 'Archivado',
};

const formatUserStatus = (status: string): string =>
  USER_STATUS_LABELS[status] ?? status;

export function AdminUsersPage() {
  const [form, setForm] = useState<CreateUserPayload>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<UserCreatedSuccessDetails | null>(null);
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [supervisorsHint, setSupervisorsHint] = useState('');
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const apiReady = isWorkflowApiConfigured();

  const loadUsers = useCallback(async () => {
    if (!apiReady) {
      return;
    }
    setUsersLoading(true);
    setUsersError('');
    try {
      const res = await listUsers();
      setUsers(res.users);
    } catch (err: unknown) {
      setUsers([]);
      setUsersError(err instanceof Error ? err.message : 'No se pudo cargar la lista de usuarios');
    } finally {
      setUsersLoading(false);
    }
  }, [apiReady]);

  const loadSupervisors = useCallback(async () => {
    if (!apiReady) {
      return;
    }
    setSupervisorsLoading(true);
    try {
      const res = await listSupervisors();
      setSupervisors(res.supervisors);
      setSupervisorsHint(res.hint ?? '');
    } catch {
      setSupervisors([]);
      setSupervisorsHint('');
    } finally {
      setSupervisorsLoading(false);
    }
  }, [apiReady]);

  useEffect(() => {
    void loadSupervisors();
    void loadUsers();
  }, [loadSupervisors, loadUsers]);

  useEffect(() => {
    if (form.role !== USER_ROLES.ANALYST) {
      setForm((f) => ({ ...f, supervisorId: '' }));
    }
  }, [form.role]);

  const handleCloseSuccess = () => {
    setSuccess(null);
    void loadSupervisors();
    void loadUsers();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!apiReady) {
      return;
    }
    setLoading(true);
    setError('');
    setSuccess(null);
    try {
      const payload: CreateUserPayload = {
        ...form,
        username: form.username.trim(),
        email: form.email.trim(),
        projectIds: [],
        supervisorId:
          form.role === USER_ROLES.ANALYST ? form.supervisorId?.trim() || undefined : undefined,
      };
      const created = await createAdminUser(payload);
      setSuccess({
        username: created.username || payload.username,
        email: created.email || payload.email,
        role: created.role || payload.role,
        emailSent: created.emailSent,
      });
      setForm(emptyForm);
      void loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="brand-card p-6 md:p-8">
        <p className="brand-kicker">Administración</p>
        <h1 className="brand-page-title mt-3">Usuarios y roles</h1>
        <p className="mt-3 text-sm text-terra-deep/75 max-w-2xl">
          Crea analistas (suben a staging en todos los proyectos del catálogo), supervisores y
          administradores. Cada analista debe tener un supervisor asignado.
        </p>
        {!apiReady && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Configura <code className="text-xs">VITE_WORKFLOW_API_URL</code> con la URL de API Gateway
            (Lambda en AWS; ver WORKFLOW_SETUP.md). Mientras tanto puedes asignar roles y atributos
            manualmente en la consola de Cognito.
          </div>
        )}
      </section>

      <UserCreatedSuccessModal
        isOpen={success !== null}
        details={success}
        onClose={handleCloseSuccess}
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="brand-card p-6">
        <h2 className="text-lg font-semibold text-terra-deep mb-4">Crear usuario</h2>
        <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="brand-label" htmlFor="adm-user">
              Usuario
            </label>
            <input
              id="adm-user"
              required
              autoComplete="username"
              className="brand-input"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
          </div>
          <div>
            <label className="brand-label" htmlFor="adm-email">
              Email
            </label>
            <input
              id="adm-email"
              type="email"
              required
              autoComplete="email"
              className="brand-input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <PasswordInput
            id="adm-pass"
            label="Contraseña temporal"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.temporaryPassword}
            onChange={(temporaryPassword) =>
              setForm((f) => ({ ...f, temporaryPassword }))
            }
          />
          <div>
            <label className="brand-label" htmlFor="adm-role">
              Rol
            </label>
            <select
              id="adm-role"
              className="brand-input"
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  role: e.target.value,
                }))
              }
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {form.role === USER_ROLES.ANALYST && (
            <div>
              <label className="brand-label" htmlFor="adm-supervisor">
                Supervisor
              </label>
              <select
                id="adm-supervisor"
                required
                className="brand-input"
                value={form.supervisorId ?? ''}
                disabled={supervisorsLoading || supervisors.length === 0}
                onChange={(e) => setForm((f) => ({ ...f, supervisorId: e.target.value }))}
              >
                <option value="">
                  {supervisorsLoading
                    ? 'Cargando supervisores…'
                    : supervisors.length === 0
                      ? '— No hay supervisores —'
                      : '— Seleccionar supervisor —'}
                </option>
                {supervisors.map((s) => (
                  <option key={s.username} value={s.username}>
                    {s.username}
                    {s.email ? ` (${s.email})` : ''}
                  </option>
                ))}
              </select>
              {supervisors.length === 0 && !supervisorsLoading && apiReady ? (
                <p className="mt-2 text-xs text-amber-800">
                  {supervisorsHint ||
                    'Crea primero un usuario con rol Supervisor y grupo SUPERVISOR en Cognito.'}
                </p>
              ) : null}
            </div>
          )}
          {form.role === USER_ROLES.ANALYST && (
            <p className="md:col-span-2 text-sm text-terra-deep/70 rounded-2xl border border-terra-moss/25 bg-terra-cream/50 px-4 py-3">
              Los analistas tienen acceso a <strong>todos los proyectos</strong> listados en{' '}
              <code className="text-xs">public/project_ids.json</code>. No hace falta asignarlos uno
              a uno.
            </p>
          )}
          <div className="md:col-span-2">
            <button type="submit" disabled={loading || !apiReady} className="brand-button-primary">
              {loading ? 'Guardando…' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </section>

      <section className="brand-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-terra-deep">Usuarios existentes</h2>
            <p className="mt-1 text-sm text-terra-deep/70">
              {usersLoading
                ? 'Cargando usuarios del User Pool…'
                : `${users.length} usuario${users.length === 1 ? '' : 's'} en Cognito`}
            </p>
          </div>
          <button
            type="button"
            disabled={usersLoading || !apiReady}
            onClick={() => void loadUsers()}
            className="brand-button-secondary text-sm"
          >
            Actualizar lista
          </button>
        </div>

        {usersError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {usersError}
            <p className="mt-2 text-xs text-red-600/90">
              Si acabas de desplegar la Lambda, añade la ruta <code>GET /users</code> en API Gateway
              y el permiso <code>cognito-idp:ListUsers</code> al rol IAM.
            </p>
          </div>
        ) : null}

        {usersLoading ? (
          <p className="text-sm text-terra-deep/70 py-6 text-center">Cargando usuarios…</p>
        ) : users.length === 0 && !usersError ? (
          <p className="text-sm text-terra-deep/70 py-6 text-center rounded-2xl border border-dashed border-terra-moss/30 bg-terra-cream/40">
            No hay usuarios registrados todavía.
          </p>
        ) : users.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-terra-moss/20">
            <table className="min-w-full text-sm">
              <thead className="bg-terra-cream/60 text-left text-xs uppercase tracking-wide text-terra-deep/70">
                <tr>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Rol</th>
                  <th className="px-4 py-3 font-semibold">Supervisor</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Activo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terra-moss/15 bg-white/70">
                {users.map((u) => (
                  <tr key={u.username} className="hover:bg-terra-cream/40">
                    <td className="px-4 py-3 font-medium text-terra-deep">{u.username}</td>
                    <td className="px-4 py-3 text-terra-deep/80">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-terra-sand/50 px-2.5 py-0.5 text-xs font-medium text-terra-deep">
                        {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-terra-deep/75">
                      {u.role === USER_ROLES.ANALYST ? u.supervisorId || '—' : '—'}
                    </td>
                    <td className="px-4 py-3 text-terra-deep/75">{formatUserStatus(u.status)}</td>
                    <td className="px-4 py-3">
                      {u.enabled ? (
                        <span className="text-emerald-700">Sí</span>
                      ) : (
                        <span className="text-red-700">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
