export const PROJECT_STATUS = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}
