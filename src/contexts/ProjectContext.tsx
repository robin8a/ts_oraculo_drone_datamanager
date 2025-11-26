import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ProjectContextType {
  selectedProject: string | null;
  setSelectedProject: (projectId: string | null) => void;
  currentPath: string;
  setCurrentPath: (path: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');

  return (
    <ProjectContext.Provider
      value={{
        selectedProject,
        setSelectedProject,
        currentPath,
        setCurrentPath,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

