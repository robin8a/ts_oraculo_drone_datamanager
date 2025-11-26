import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Welcome to S3 File Manager</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-lg mb-4">
          Hello, <strong>{user?.username}</strong>!
        </p>
        <p className="text-gray-600 mb-6">
          You have access to {user?.project_ids.length || 0} project(s).
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go to Projects
        </button>
      </div>
    </div>
  );
}

