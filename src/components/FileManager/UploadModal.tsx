import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import { createPortal } from 'react-dom';

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
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const updateSelectedFile = (selectedFile: File | null) => {
    if (!selectedFile) {
      return;
    }
    setFile(selectedFile);
    setError('');
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateSelectedFile(e.target.files?.[0] ?? null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    updateSelectedFile(e.dataTransfer.files?.[0] ?? null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Selecciona un archivo para continuar');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onUpload(file);
      setFile(null);
      onClose();
    } catch (err) {
      setError('No se pudo subir el archivo');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="mask fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-[1.5rem] border border-terra-moss/25 bg-white/95 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full border border-terra-moss/30 bg-white/80 p-1.5 text-terra-deep transition hover:bg-terra-cream"
          aria-label="Cerrar modal de subida"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <p className="brand-kicker">Archivo</p>
        <h2 className="mt-2 text-2xl font-semibold text-terra-deep">Subir archivo</h2>
        <p className="mt-2 text-sm text-terra-deep/70">Ruta actual: {currentPath || '/'}</p>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div
            role="button"
            tabIndex={0}
            aria-label="Arrastra y suelta un archivo o haz clic para seleccionar"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
              isDragging
                ? 'border-terra-primary bg-terra-cream/60'
                : 'border-terra-moss/40 bg-terra-cream/30 hover:bg-terra-cream/50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-sm font-medium text-terra-deep">
              Arrastra un archivo aquí o haz clic para seleccionarlo
            </p>
            {file ? (
              <p className="mt-2 text-xs text-terra-primary">Seleccionado: {file.name}</p>
            ) : (
              <p className="mt-2 text-xs text-terra-deep/65">Formato libre, un archivo por carga</p>
            )}
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
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
              {loading ? 'Subiendo...' : 'Subir archivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}

