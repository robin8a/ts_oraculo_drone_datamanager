/**
 * Lista de proyectos desde `public/project_ids.json` (solo lectura).
 * Formato aceptado:
 * - Objeto: `{ "project_ids": ["id-1", "id-2"] }`
 * - Array directo: `["id-1", "id-2"]`
 */
export const loadPublicProjectIdsJson = async (): Promise<string[]> => {
  try {
    const response = await fetch('/project_ids.json');
    if (!response.ok) {
      return [];
    }
    const data: unknown = await response.json();
    if (Array.isArray(data) && data.every((id) => typeof id === 'string')) {
      return data as string[];
    }
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const raw = (data as Record<string, unknown>).project_ids;
      if (Array.isArray(raw) && raw.every((id) => typeof id === 'string')) {
        return raw as string[];
      }
    }
    return [];
  } catch {
    return [];
  }
};
