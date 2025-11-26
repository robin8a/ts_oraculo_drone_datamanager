import { useState, useEffect } from 'react';
import { loadAWSConfig } from '../utils/configLoader';
import type { AWSConfig } from '../types/config';

export function SettingsPage() {
  const [config, setConfig] = useState<AWSConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAWSConfig()
      .then(setConfig)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        {loading ? (
          <p>Loading settings...</p>
        ) : config ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                S3 Bucket
              </label>
              <input
                type="text"
                value={config.bucket}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AWS Access Key
              </label>
              <input
                type="text"
                value={config.accessKey}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AWS Secret Key
              </label>
              <input
                type="password"
                value="••••••••"
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Configuration is loaded from config.json. To modify settings, edit the config.json file.
            </p>
          </div>
        ) : (
          <p className="text-red-600">Failed to load configuration</p>
        )}
      </div>
    </div>
  );
}

