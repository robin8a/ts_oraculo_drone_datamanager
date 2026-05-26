import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/user';
import { authDebugLog } from '../utils/authDebug';
import { loadPublicProjectIdsJson } from '../utils/projectIdsFromJson';
import { CUSTOM_ROLE_ATTRIBUTE, USER_ROLES } from '../constants/roles';
import {
  fetchCognitoGroupsFromSession,
  fetchCustomRoleFromToken,
  resolveUserRole,
} from '../utils/roleFromSession';
import {
  signIn,
  signOut,
  confirmSignIn,
  getCurrentUser,
  fetchUserAttributes,
} from 'aws-amplify/auth';

export type LoginFlowResult = 'success' | 'invalid' | 'new_password_required';

interface PendingNewPassword {
  username: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  isAwaitingNewPassword: boolean;
  pendingPasswordUsername: string | null;
  login: (username: string, password: string) => Promise<LoginFlowResult>;
  completeNewPassword: (newPassword: string) => Promise<boolean>;
  cancelAwaitingNewPassword: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const parseProjectIdsFromAttrs = (attrs: Record<string, string | undefined>): string[] => {
  const value = attrs['custom:project_ids'];
  if (!value) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
      return [];
    }
    return parsed as string[];
  } catch {
    return [];
  }
};

const buildUserFromCognito = async (): Promise<User | null> => {
  try {
    const { username } = await getCurrentUser();
    const attrs = await fetchUserAttributes();
    const record = attrs as Record<string, string | undefined>;
    const groups = await fetchCognitoGroupsFromSession();
    const customRoleFromToken = await fetchCustomRoleFromToken();
    const role = resolveUserRole(
      record[CUSTOM_ROLE_ATTRIBUTE],
      groups,
      customRoleFromToken
    );

    let project_ids = parseProjectIdsFromAttrs(record);
    /** Analistas: siempre todos los proyectos del catálogo (`public/project_ids.json`). */
    if (role === USER_ROLES.ANALYST) {
      project_ids = await loadPublicProjectIdsJson();
    } else if (project_ids.length === 0) {
      project_ids = await loadPublicProjectIdsJson();
    }
    if (project_ids.length > 0) {
      authDebugLog('project_ids resueltos', {
        rol: role,
        cantidad: project_ids.length,
      });
    }

    const supervisorRaw = record['custom:supervisor_id'];
    const supervisor_id =
      supervisorRaw && supervisorRaw.trim() !== '' ? supervisorRaw.trim() : null;

    return {
      username,
      email: record.email ?? null,
      project_ids,
      role,
      supervisor_id,
      groups,
    };
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [pendingNewPassword, setPendingNewPassword] = useState<PendingNewPassword | null>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const u = await buildUserFromCognito();
        if (!cancelled && u) {
          setUser(u);
          setIsAuthenticated(true);
          authDebugLog('Sesión Cognito restaurada', { usuario: u.username, rol: u.role });
        }
      } catch (error) {
        authDebugLog('Sin sesión Cognito al iniciar', {
          mensaje: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (!cancelled) {
          setIsAuthReady(true);
          authDebugLog('Auth listo (isAuthReady)', {});
        }
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSession = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const login = async (username: string, password: string): Promise<LoginFlowResult> => {
    setPendingNewPassword(null);
    const u = username.trim();
    authDebugLog('AuthContext.login: Cognito signIn', { usuario: u });
    try {
      const { nextStep } = await signIn({ username: u, password });

      if (nextStep.signInStep === 'DONE') {
        const userData = await buildUserFromCognito();
        if (!userData) {
          authDebugLog('AuthContext.login: signIn DONE pero sin usuario', {});
          return 'invalid';
        }
        persistSession(userData);
        authDebugLog('AuthContext.login: resultado', {
          flujo: 'success',
          usuario: userData.username,
          rol: userData.role,
        });
        return 'success';
      }

      if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setPendingNewPassword({ username: u });
        authDebugLog('AuthContext.login: resultado', {
          flujo: 'new_password_required',
          usuario: u,
        });
        return 'new_password_required';
      }

      authDebugLog('AuthContext.login: paso no soportado', {
        signInStep: nextStep.signInStep,
      });
      return 'invalid';
    } catch (error) {
      authDebugLog('AuthContext.login: error Cognito', {
        mensaje: error instanceof Error ? error.message : String(error),
      });
      return 'invalid';
    }
  };

  const completeNewPassword = async (newPassword: string): Promise<boolean> => {
    if (!pendingNewPassword) {
      authDebugLog('completeNewPassword: sin usuario pendiente', {});
      return false;
    }
    authDebugLog('completeNewPassword: confirmSignIn Cognito', {
      usuario: pendingNewPassword.username,
      longitudNueva: newPassword.length,
    });
    try {
      const { nextStep } = await confirmSignIn({ challengeResponse: newPassword });
      if (nextStep.signInStep !== 'DONE') {
        authDebugLog('completeNewPassword: paso adicional requerido', {
          signInStep: nextStep.signInStep,
        });
        return false;
      }
      const userData = await buildUserFromCognito();
      if (!userData) {
        return false;
      }
      persistSession(userData);
      setPendingNewPassword(null);
      authDebugLog('completeNewPassword: sesión iniciada', { usuario: userData.username });
      return true;
    } catch (error) {
      authDebugLog('completeNewPassword: error', {
        mensaje: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  };

  const cancelAwaitingNewPassword = () => {
    authDebugLog('cancelAwaitingNewPassword', {});
    setPendingNewPassword(null);
    void signOut().catch(() => undefined);
  };

  const logout = async (): Promise<void> => {
    authDebugLog('logout', { usuarioAnterior: user?.username ?? null });
    setUser(null);
    setIsAuthenticated(false);
    setPendingNewPassword(null);
    try {
      await signOut();
    } catch {
      /* signOut falló; estado local ya se limpió */
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAuthReady,
        isAwaitingNewPassword: pendingNewPassword !== null,
        pendingPasswordUsername: pendingNewPassword?.username ?? null,
        login,
        completeNewPassword,
        cancelAwaitingNewPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
