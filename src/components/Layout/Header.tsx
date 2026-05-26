import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../constants/roles';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-terra-moss/20 bg-terra-deep text-white shadow-brand">
      <div className="flex w-full items-center justify-between px-[10px] py-4">
        <div className="flex items-center gap-4">
          <Link to="/home" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-bold text-terra-sand">
              TS
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-wide text-terra-sand">
                Terrasacha
              </p>
              <p className="text-xs uppercase tracking-[0.28em] text-white/70">
                Pioneros del Mañana
              </p>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-white/80">
              {user.username}
              {user.role ? ` · ${ROLE_LABELS[user.role]}` : ' · sin rol'}
            </span>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="brand-button-secondary border-white/15 bg-white/10 px-4 py-2 text-white hover:bg-white/20"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}

