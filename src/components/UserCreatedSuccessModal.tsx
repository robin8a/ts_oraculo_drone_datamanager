import { useEffect } from 'react';
import { ROLE_LABELS, type UserRole } from '../constants/roles';

export type UserCreatedSuccessDetails = {
  username: string;
  email: string;
  role: string;
  emailSent?: boolean;
};

interface UserCreatedSuccessModalProps {
  isOpen: boolean;
  details: UserCreatedSuccessDetails | null;
  onClose: () => void;
}

export const UserCreatedSuccessModal = ({
  isOpen,
  details,
  onClose,
}: UserCreatedSuccessModalProps) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !details) {
    return null;
  }

  const roleLabel =
    ROLE_LABELS[details.role as UserRole] ?? details.role;

  const handleBackdropClick = () => {
    onClose();
  };

  const handleBackdropKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-terra-deep/70 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-[1.5rem] border border-terra-moss/25 bg-white p-6 shadow-brand"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-created-title"
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-terra-moss/15 text-terra-moss"
            aria-hidden
          >
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="brand-kicker">Administración</p>
            <h2
              id="user-created-title"
              className="mt-1 text-2xl font-semibold text-terra-deep"
            >
              Usuario creado con éxito
            </h2>
          </div>
        </div>

        <dl className="mt-6 space-y-3 rounded-2xl border border-terra-moss/20 bg-terra-cream/60 px-4 py-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-terra-deep/65">Usuario</dt>
            <dd className="font-medium text-terra-deep">{details.username}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-terra-deep/65">Correo</dt>
            <dd className="font-medium text-terra-deep break-all text-right">
              {details.email}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-terra-deep/65">Rol</dt>
            <dd className="font-medium text-terra-deep">{roleLabel}</dd>
          </div>
        </dl>

        <p className="mt-4 text-sm text-terra-deep/75">
          {details.emailSent !== false
            ? 'Se envió un correo con las credenciales de acceso (revisa también spam).'
            : 'El usuario fue creado en Cognito. Comunica las credenciales por otro canal si no llegó el correo.'}
        </p>
        <p className="mt-2 text-sm text-terra-deep/70">
          En el primer inicio de sesión deberá cambiar la contraseña temporal.
        </p>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="brand-button-primary min-w-28"
            autoFocus
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
