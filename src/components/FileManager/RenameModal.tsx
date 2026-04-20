import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
  currentName: string;
  isFolder: boolean;
}

export function RenameModal({
  isOpen,
  onClose,
  onRename,
  currentName,
  isFolder,
}: RenameModalProps) {
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName);
      setError('');
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onRename(newName.trim());
      onClose();
    } catch (err) {
      setError('Failed to rename');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-terra-deep/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.5rem] border border-terra-moss/25 bg-white p-6 shadow-brand">
        <p className="brand-kicker">{isFolder ? 'Carpeta' : 'Archivo'}</p>
        <h2 className="mt-2 text-2xl font-semibold text-terra-deep">
          Renombrar {isFolder ? 'carpeta' : 'archivo'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="brand-label">
              Nuevo nombre
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="brand-input"
              autoFocus
            />
          </div>
          {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="brand-button-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="brand-button-primary"
            >
              {loading ? 'Renombrando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

