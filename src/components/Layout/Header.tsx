import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-gray-900 text-white p-4 shadow-md">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link to="/home" className="text-xl font-bold hover:text-gray-300">
            Home
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {user && (
            <span className="text-sm text-gray-300">Welcome, {user.username}</span>
          )}
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

