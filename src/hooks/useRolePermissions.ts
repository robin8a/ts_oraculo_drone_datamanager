import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPermissionsForRole } from '../utils/permissions';

export const useRolePermissions = () => {
  const { user } = useAuth();
  return useMemo(() => getPermissionsForRole(user?.role ?? null), [user?.role]);
};
