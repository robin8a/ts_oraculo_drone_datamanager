import { useState, type KeyboardEvent } from 'react';

type PasswordInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  placeholder?: string;
};

const EyeOpenIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
    />
  </svg>
);

export const PasswordInput = ({
  id,
  label,
  value,
  onChange,
  required = false,
  minLength,
  autoComplete,
  placeholder,
}: PasswordInputProps) => {
  const [visible, setVisible] = useState(false);

  const handleToggleVisibility = () => {
    setVisible((prev) => !prev);
  };

  const handleToggleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggleVisibility();
    }
  };

  return (
    <div>
      <label className="brand-label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="brand-input w-full pr-12"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          tabIndex={0}
          onClick={handleToggleVisibility}
          onKeyDown={handleToggleKeyDown}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-terra-deep/55 transition hover:bg-terra-cream hover:text-terra-deep"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
        >
          {visible ? <EyeOffIcon /> : <EyeOpenIcon />}
        </button>
      </div>
    </div>
  );
};
