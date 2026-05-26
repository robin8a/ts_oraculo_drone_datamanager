import type { UserRole } from '../constants/roles';

export interface User {
  username: string;
  email: string | null;
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
