import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../constants/roles';
import { isAdminRole } from '../constants/roles';
import { AuthLoadingScreen } from './ProtectedRoute';

interface RoleRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { user, isAuthenticated, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.role) {
    return <Navigate to="/home" state={{ accessDenied: 'missing_role' }} replace />;
  }

  /** ADMIN (`custom:role`) puede entrar a cualquier ruta protegida por rol. */
  if (isAdminRole(user.role)) {
    return <>{children}</>;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to="/home"
        state={{ accessDenied: 'wrong_role', requiredRoles: allowedRoles }}
        replace
      />
    );
  }

  return <>{children}</>;
}
