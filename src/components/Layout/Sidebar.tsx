import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen p-4">
      <h2 className="text-xl font-bold mb-6">Menu</h2>
      <nav className="space-y-2">
        <Link
          to="/home"
          className={`block px-4 py-2 rounded ${
            isActive('/home') ? 'bg-gray-700' : 'hover:bg-gray-700'
          }`}
        >
          Home
        </Link>
        <Link
          to="/projects"
          className={`block px-4 py-2 rounded ${
            isActive('/projects') ? 'bg-gray-700' : 'hover:bg-gray-700'
          }`}
        >
          Projects
        </Link>
        <Link
          to="/settings"
          className={`block px-4 py-2 rounded ${
            isActive('/settings') ? 'bg-gray-700' : 'hover:bg-gray-700'
          }`}
        >
          Settings
        </Link>
        <button
          onClick={logout}
          className="w-full text-left px-4 py-2 rounded hover:bg-gray-700"
        >
          Logout
        </button>
      </nav>
    </aside>
  );
}

