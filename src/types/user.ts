import type { UserRole } from '../constants/roles';

export interface User {
  username: string;
  email: string | null;
  /** @deprecated Catálogo real en S3 `public/_projects/`. Se mantiene vacío por compatibilidad. */
  project_ids: string[];
  /** Desde Cognito `custom:role` (ADMIN | SUPERVISOR | ANALYST). */
  role: UserRole | null;
  supervisor_id: string | null;
  groups: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}
