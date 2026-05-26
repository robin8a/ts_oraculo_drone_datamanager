import type { SubmissionStatus } from '../constants/workflowStorage';

export interface SubmissionRecord {
  id: string;
  projectId: string;
  analystUsername: string;
  supervisorUsername: string;
  status: SubmissionStatus;
  stagingPrefix: string;
  createdAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectReason: string | null;
  fileCount: number;
  notes: string | null;
}

export interface WorkflowNotification {
  id: string;
  submissionId: string;
  projectId: string;
  analystUsername: string;
  supervisorUsername: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface SupervisorOption {
  username: string;
  email: string;
  role: string;
}

export interface SupervisorsListResponse {
  supervisors: SupervisorOption[];
  hint?: string;
}

export interface UsersListResponse {
  users: AdminUserSummary[];
  total: number;
}

export interface AdminUserSummary {
  username: string;
  email: string;
  role: string;
  supervisorId: string | null;
  projectIds: string[];
  enabled: boolean;
  status: string;
  emailSent?: boolean;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  temporaryPassword: string;
  role: string;
  supervisorId?: string;
  projectIds: string[];
}

export interface UpdateUserPayload {
  role?: string;
  supervisorId?: string | null;
  projectIds?: string[];
  email?: string;
}
