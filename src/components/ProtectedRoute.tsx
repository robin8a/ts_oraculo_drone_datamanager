import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authDebugLog } from '../utils/authDebug';

export const AuthLoadingScreen = () => (
  <div
    className="flex min-h-screen items-center justify-center bg-terra-cream/40 px-4"
    role="status"
    aria-live="polite"
    aria-label="Cargando sesión"
  >
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-terra-moss/20 bg-white/80 px-8 py-6 shadow-brand backdrop-blur">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-terra-moss/30 border-t-terra-deep"
        aria-hidden
      />
      <p className="text-sm text-terra-deep/70">Comprobando sesión…</p>
    </div>
  </div>
);

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isAuthReady } = useAuth();

  useEffect(() => {
    if (!isAuthReady) {
      authDebugLog('ProtectedRoute: esperando hidratación de sesión', {});
      return;
    }
    if (!isAuthenticated) {
      authDebugLog('ProtectedRoute: sin sesión → /login', {});
    }
  }, [isAuthReady, isAuthenticated]);

  if (!isAuthReady) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

interface GuestRouteProps {
  children: ReactNode;
}

/** Solo contenido para usuarios no autenticados (p. ej. login). Si ya hay sesión, redirige al inicio. */
export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isAuthReady } = useAuth();

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }
    if (isAuthenticated) {
      authDebugLog('GuestRoute: ya hay sesión → /home', {});
    }
  }, [isAuthReady, isAuthenticated]);

  if (!isAuthReady) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

