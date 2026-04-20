import { useState, useEffect } from 'react';
import { loadAWSConfig } from '../utils/configLoader';
import type { AWSConfig } from '../types/config';

export function SettingsPage() {
  const [config, setConfig] = useState<AWSConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAWSConfig()
      .then(setConfig)
      .catch((err) => {
        alert(`Failed to load configuration: ${err.message || 'Unknown error'}`);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <p className="brand-kicker">Configuración</p>
        <h1 className="brand-page-title mt-3">Ajustes del entorno</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-terra-deep/75">
          Consulta la configuración activa del acceso a S3 dentro de una presentación más consistente con la identidad Terrasacha.
        </p>
      </section>
      <div className="brand-card p-6 md:p-8">
        {loading ? (
          <p className="text-terra-deep/70">Cargando configuración...</p>
        ) : config ? (
          <div className="space-y-4">
            <div>
              <label className="brand-label">
                S3 Bucket
              </label>
              <input
                type="text"
                value={config.bucket}
                disabled
                className="brand-input cursor-not-allowed bg-terra-cream/75 text-terra-deep/75"
              />
            </div>
            <div>
              <label className="brand-label">
                AWS Access Key
              </label>
              <input
                type="text"
                value={config.accessKey}
                disabled
                className="brand-input cursor-not-allowed bg-terra-cream/75 text-terra-deep/75"
              />
            </div>
            <div>
              <label className="brand-label">
                AWS Secret Key
              </label>
              <input
                type="password"
                value="••••••••"
                disabled
                className="brand-input cursor-not-allowed bg-terra-cream/75 text-terra-deep/75"
              />
            </div>
            <p className="rounded-2xl border border-terra-moss/25 bg-terra-cream/70 px-4 py-3 text-sm text-terra-deep/75">
              Estos valores vienen de variables <code className="text-xs">VITE_*</code> en <code className="text-xs">.env</code>{' '}
              (claves estáticas en el bundle de cliente). En <strong className="font-medium">Archivos</strong> la app usa en cambio
              S3 con credenciales temporales de tu sesión Cognito (Identity Pool + bucket de Amplify).
            </p>
          </div>
        ) : (
          <p className="text-red-600">No se pudo cargar la configuración</p>
        )}
      </div>
    </div>
  );
}

