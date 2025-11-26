import type { AWSConfig } from '../types/config';
import type { UserAuth } from '../types/config';

export async function loadAWSConfig(): Promise<AWSConfig> {
  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error('Failed to load config.json');
    }
    const config: AWSConfig = await response.json();
    return config;
  } catch (error) {
    console.error('Error loading AWS config:', error);
    throw error;
  }
}

export async function loadUsersAuth(): Promise<UserAuth[]> {
  try {
    const response = await fetch('/users_auth.json');
    if (!response.ok) {
      throw new Error('Failed to load users_auth.json');
    }
    const users: UserAuth[] = await response.json();
    return users;
  } catch (error) {
    console.error('Error loading users auth:', error);
    throw error;
  }
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<UserAuth | null> {
  const users = await loadUsersAuth();
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  return user || null;
}

