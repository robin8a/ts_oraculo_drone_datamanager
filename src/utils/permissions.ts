import { USER_ROLES, type UserRole } from '../constants/roles';

export interface RolePermissions {
  /** Subir archivos a staging (solo analista). */
  uploadToStaging: boolean;
  /** Enviar lote a revisión del supervisor. */
  submitForReview: boolean;
  /** Bandeja: aprobar / rechazar envíos. */
  approveSubmissions: boolean;
  /** Ver explorador en zona approved/. */
  accessApprovedFiles: boolean;
  /** Usar /files en modo staging (analista). */
  accessStagingFileManager: boolean;
  /** Subir, carpetas y borrar en staging propio (analista). */
  manageStagingFiles: boolean;
  /** Subir o crear carpetas en approved (solo admin). */
  manageApprovedFiles: boolean;
  downloadFiles: boolean;
  previewImages: boolean;
  deleteFiles: boolean;
  renameFiles: boolean;
  copyMoveFiles: boolean;
  createFolders: boolean;
  manageUsers: boolean;
  accessSettings: boolean;
}

const DENIED: RolePermissions = {
  uploadToStaging: false,
  submitForReview: false,
  approveSubmissions: false,
  accessApprovedFiles: false,
  accessStagingFileManager: false,
  manageStagingFiles: false,
  manageApprovedFiles: false,
  downloadFiles: false,
  previewImages: false,
  deleteFiles: false,
  renameFiles: false,
  copyMoveFiles: false,
  createFolders: false,
  manageUsers: false,
  accessSettings: false,
};

export const getPermissionsForRole = (role: UserRole | null): RolePermissions => {
  if (!role) {
    return DENIED;
  }

  if (role === USER_ROLES.ADMIN) {
    return {
      uploadToStaging: true,
      submitForReview: true,
      approveSubmissions: true,
      accessApprovedFiles: true,
      accessStagingFileManager: true,
      manageStagingFiles: true,
      manageApprovedFiles: true,
      downloadFiles: true,
      previewImages: true,
      deleteFiles: true,
      renameFiles: true,
      copyMoveFiles: true,
      createFolders: true,
      manageUsers: true,
      accessSettings: true,
    };
  }

  if (role === USER_ROLES.SUPERVISOR) {
    return {
      uploadToStaging: false,
      submitForReview: false,
      approveSubmissions: true,
      accessApprovedFiles: true,
      accessStagingFileManager: false,
      manageStagingFiles: false,
      manageApprovedFiles: false,
      downloadFiles: true,
      previewImages: true,
      deleteFiles: false,
      renameFiles: false,
      copyMoveFiles: false,
      createFolders: false,
      manageUsers: false,
      accessSettings: false,
    };
  }

  if (role === USER_ROLES.ANALYST) {
    return {
      uploadToStaging: true,
      submitForReview: true,
      approveSubmissions: false,
      accessApprovedFiles: false,
      accessStagingFileManager: true,
      manageStagingFiles: true,
      manageApprovedFiles: false,
      downloadFiles: true,
      previewImages: true,
      deleteFiles: true,
      renameFiles: true,
      copyMoveFiles: false,
      createFolders: true,
      manageUsers: false,
      accessSettings: false,
    };
  }

  return DENIED;
};

export const canAccessFileManager = (role: UserRole | null): boolean => {
  const p = getPermissionsForRole(role);
  return p.accessApprovedFiles || p.accessStagingFileManager;
};

export const usesStagingFileManager = (role: UserRole | null): boolean =>
  getPermissionsForRole(role).accessStagingFileManager &&
  !getPermissionsForRole(role).accessApprovedFiles;

export const canAccessAdminPanel = (role: UserRole | null): boolean =>
  getPermissionsForRole(role).manageUsers;

export const canAccessSupervisorInbox = (role: UserRole | null): boolean =>
  getPermissionsForRole(role).approveSubmissions;

/** Administrador: todas las pantallas y acciones de la app. */
export const hasFullAppAccess = (role: UserRole | null): boolean =>
  role === USER_ROLES.ADMIN;
