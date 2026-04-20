import { useState, useEffect } from 'react';
import type { S3Connection } from '../../services/s3Service';
import { getImageUrl } from '../../services/s3Service';

interface ImagePreviewModalProps {
  s3Connection: S3Connection;
  isOpen: boolean;
  onClose: () => void;
  imageKey: string;
  imageName: string;
}

export function ImagePreviewModal({
  s3Connection,
  isOpen,
  onClose,
  imageKey,
  imageName,
}: ImagePreviewModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && imageKey) {
      setLoading(true);
      setError(null);
      getImageUrl(s3Connection, imageKey)
        .then((url) => {
          setImageUrl(url);
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to load image');
          setLoading(false);
        });
    } else {
      setImageUrl(null);
    }
  }, [isOpen, imageKey, s3Connection]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-terra-deep/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div
        className="relative max-h-[90vh] max-w-7xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full border border-white/15 bg-black/45 p-2 text-white transition hover:bg-black/65"
          aria-label="Close preview"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="overflow-hidden rounded-[1.5rem] border border-terra-moss/20 bg-white shadow-brand">
          <div className="border-b border-terra-moss/20 bg-terra-cream/85 p-4">
            <h3 className="truncate text-lg font-semibold text-terra-deep">
              {imageName}
            </h3>
          </div>

          <div className="flex items-center justify-center bg-terra-deep p-4">
            {loading ? (
              <div className="py-20">
                <svg
                  className="mx-auto h-12 w-12 animate-spin text-terra-sand"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="mt-4 text-white">Cargando imagen...</p>
              </div>
            ) : error ? (
              <div className="py-20 text-white">
                <p className="text-lg">{error}</p>
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={imageName}
                className="max-w-full max-h-[70vh] object-contain"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

