import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';

export function ProjectsPage() {
  const { user } = useAuth();
  const { selectedProject, setSelectedProject } = useProject();
  const navigate = useNavigate();

  const handleSelectProject = (projectId: string) => {
    setSelectedProject(projectId);
    navigate('/files');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Projects</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        {user?.project_ids && user.project_ids.length > 0 ? (
          <div className="space-y-3">
            {user.project_ids.map((projectId) => (
              <div
                key={projectId}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedProject === projectId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleSelectProject(projectId)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{projectId}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectProject(projectId);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No projects available</p>
        )}
      </div>
    </div>
  );
}

