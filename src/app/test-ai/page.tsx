'use client';

import { useEffect, useState } from 'react';
import LanguageModelTest from '@/components/LanguageModelTest';

interface ProviderHealth {
  id: string;
  name: string;
  freeTier: boolean;
  configured: boolean;
  available: boolean | null;
  model: string;
  detail?: string;
}

export default function TestPage() {
  const [health, setHealth] = useState<{
    healthy: boolean;
    remoteConfigured: boolean;
    creditsEnabled: boolean;
    reachable: string[];
    providers: ProviderHealth[];
    hint?: string;
  } | null>(null);
  const [healthError, setHealthError] = useState('');

  useEffect(() => {
    fetch('/api/ai/health')
      .then(async (res) => {
        if (!res.ok) throw new Error('Health check failed');
        setHealth(await res.json());
      })
      .catch((e) => setHealthError(e.message));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold text-center">AI Integration Test</h1>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cloud Providers (free tier)</h2>
          {healthError && <p className="text-sm text-red-600">{healthError}</p>}
          {!health && !healthError && <p className="text-sm text-gray-500">Checking providers…</p>}
          {health && (
            <div className="space-y-2">
              {health.providers.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b border-gray-100 py-2 last:border-0">
                  <div>
                    <span className="font-medium text-gray-900">{p.name}</span>
                    <span className="ml-2 text-xs text-gray-500">{p.model}</span>
                    {p.detail && <p className="text-xs text-yellow-700 mt-0.5">{p.detail}</p>}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      p.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {p.available ? 'Reachable' : p.configured ? 'Unreachable' : 'No key'}
                  </span>
                </div>
              ))}
              {health.hint && <p className="text-xs text-gray-600 pt-2">{health.hint}</p>}
            </div>
          )}
        </div>

        <LanguageModelTest />
      </div>
    </div>
  );
}
