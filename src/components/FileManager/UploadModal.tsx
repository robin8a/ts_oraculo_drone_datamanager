import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  currentPath: string;
}

export function UploadModal({ isOpen, onClose, onUpload, currentPath }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onUpload(file);
      setFile(null);
      onClose();
    } catch (err) {
      setError('Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-terra-deep/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.5rem] border border-terra-moss/25 bg-white p-6 shadow-brand">
        <p className="brand-kicker">Archivo</p>
        <h2 className="mt-2 text-2xl font-semibold text-terra-deep">Subir archivo</h2>
        <p className="mt-2 text-sm text-terra-deep/70">Ruta actual: {currentPath || '/'}</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="file"
              onChange={handleFileChange}
              className="brand-input"
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
              disabled={loading || !file}
              className="brand-button-primary"
            >
              {loading ? 'Subiendo...' : 'Subir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

