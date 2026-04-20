import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const MIN_NEW_PASSWORD_LENGTH = 8;

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const {
    login,
    isAwaitingNewPassword,
    pendingPasswordUsername,
    completeNewPassword,
    cancelAwaitingNewPassword,
  } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const flow = await login(username.trim(), password);
      if (flow === 'success') {
        navigate('/home');
        return;
      }
      if (flow === 'new_password_required') {
        setNewPassword('');
        setConfirmNewPassword('');
        return;
      }
      setError('Usuario o contraseña incorrectos');
    } catch {
      setError('Ocurrió un error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleNewPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < MIN_NEW_PASSWORD_LENGTH) {
      setError(`La nueva contraseña debe tener al menos ${MIN_NEW_PASSWORD_LENGTH} caracteres`);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (newPassword === password) {
      setError('La nueva contraseña debe ser distinta de la temporal');
      return;
    }

    setLoading(true);
    try {
      const ok = await completeNewPassword(newPassword);
      if (ok) {
        navigate('/home');
        return;
      }
      setError('No se pudo guardar la nueva contraseña. Vuelve a intentar el acceso.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelNewPassword = () => {
    setNewPassword('');
    setConfirmNewPassword('');
    setError('');
    cancelAwaitingNewPassword();
  };

  if (isAwaitingNewPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-terra-moss/25 bg-white/80 p-8 shadow-brand backdrop-blur md:p-10">
          <p className="brand-kicker">Seguridad</p>
          <h2 className="brand-page-title mt-3 text-2xl md:text-3xl">Nueva contraseña</h2>
          {pendingPasswordUsername ? (
            <p className="mt-3 rounded-2xl border border-terra-moss/25 bg-terra-moss/10 px-4 py-3 text-sm font-medium text-terra-deep">
              Cuenta: <span className="font-mono">{pendingPasswordUsername}</span>
            </p>
          ) : null}
          <p className="brand-muted mt-3" id="new-password-hint">
            Tu cuenta usa una contraseña temporal. Define una contraseña nueva para continuar.
          </p>
          <form
            onSubmit={handleNewPasswordSubmit}
            className="mt-8 space-y-5"
            aria-describedby="new-password-hint"
          >
            <div>
              <label htmlFor="new-password" className="brand-label">
                Nueva contraseña
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={MIN_NEW_PASSWORD_LENGTH}
                autoComplete="new-password"
                aria-required="true"
                aria-invalid={error ? 'true' : 'false'}
                className="brand-input"
              />
            </div>
            <div>
              <label htmlFor="confirm-new-password" className="brand-label">
                Confirmar contraseña
              </label>
              <input
                id="confirm-new-password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={MIN_NEW_PASSWORD_LENGTH}
                autoComplete="new-password"
                aria-required="true"
                className="brand-input"
              />
            </div>
            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancelNewPassword}
                className="rounded-2xl border border-terra-moss/30 px-5 py-3 text-sm font-medium text-terra-deep transition hover:bg-terra-moss/10"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={loading}
                className="brand-button-primary flex-1 py-3 sm:flex-none sm:px-8"
              >
                {loading ? 'Guardando…' : 'Guardar y entrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-terra-moss/25 bg-white/70 shadow-brand backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-terra-deep px-10 py-12 text-white md:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,215,154,0.24),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(177,193,129,0.28),transparent_35%)]" />
          <div className="relative">
            <p className="brand-kicker text-terra-sand">Terrasacha</p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-wide text-terra-sand">
              Pioneros del Mañana
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-white/80">
              Un entorno documental con identidad ecológica, tecnológica y ancestral para gestionar proyectos con claridad.
            </p>
            <div className="mt-10 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-terra-sand/80">Valores</p>
                <p className="mt-2 text-sm leading-6 text-white/80">
                  Innovación, conciencia, transformación, educación y responsabilidad.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-terra-sand/80">Tono visual</p>
                <p className="mt-2 text-sm leading-6 text-white/80">
                  Inspiracional, ecológico y tecnológico, con superficies limpias y acentos tierra.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="p-8 md:p-10">
          <div className="mx-auto w-full max-w-md">
            <p className="brand-kicker">Acceso</p>
            <h2 className="brand-page-title mt-3 text-2xl md:text-3xl">Iniciar sesión</h2>
            <p className="brand-muted mt-3">
              Ingresa tus credenciales para acceder al gestor documental Terrasacha.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="username" className="brand-label">
                  Usuario
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="brand-input"
                />
              </div>
              <div>
                <label htmlFor="password" className="brand-label">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="brand-input"
                />
              </div>
              {error && (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="brand-button-primary w-full py-3"
              >
                {loading ? 'Ingresando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

