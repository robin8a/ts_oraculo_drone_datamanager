export interface AWSConfig {
  bucket: string;
  accessKey: string;
  secretKey: string;
}

export interface UserAuth {
  username: string;
  password: string;
  project_ids: string[];
}

