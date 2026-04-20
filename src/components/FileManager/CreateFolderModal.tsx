import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (folderName: string) => Promise<void>;
  /** Nivel geográfico que representa la nueva carpeta (País, Departamento, …). */
  nextLevelLabel?: string;
}

export function CreateFolderModal({
  isOpen,
  onClose,
  onCreate,
  nextLevelLabel,
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('El nombre de la carpeta no puede estar vacío');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onCreate(folderName.trim());
      onClose();
    } catch (err) {
      setError('No se pudo crear la carpeta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-terra-deep/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.5rem] border border-terra-moss/25 bg-white p-6 shadow-brand">
        <p className="brand-kicker">Estructura</p>
        <h2 className="mt-2 text-2xl font-semibold text-terra-deep">Crear carpeta</h2>
        <form onSubmit={handleSubmit}>
          {nextLevelLabel && (
            <p className="mb-4 rounded-2xl border border-terra-moss/20 bg-terra-cream/70 px-4 py-3 text-sm text-terra-deep/80">
              Siguiente nivel sugerido en la jerarquía:{' '}
              <span className="font-semibold text-terra-deep">{nextLevelLabel}</span>
              . Usa el mismo código que en S3 (por ejemplo país <code className="text-xs">CO</code>, departamento{' '}
              <code className="text-xs">MET</code>, etc.).
            </p>
          )}
          <div className="mb-4">
            <label className="brand-label">
              Nombre de la carpeta
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="brand-input"
              placeholder={nextLevelLabel ? `Ej. código para «${nextLevelLabel}»` : 'Nombre de carpeta'}
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
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

