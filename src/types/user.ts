export interface User {
  username: string;
  project_ids: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

