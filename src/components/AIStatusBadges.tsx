'use client';

import { useEffect, useState } from 'react';

interface CloudBadge {
  id: string;
  label: string;
  state: 'ok' | 'warn' | 'off';
  title: string;
}

/**
 * AIStatusBadges — one shared indicator used on every AI surface.
 * Shows the 2 cloud APIs (Mistral, OpenRouter) from live server health plus
 * on-device Gemini Nano availability in this browser.
 */
export default function AIStatusBadges() {
  const [cloud, setCloud] = useState<CloudBadge[] | null>(null);
  const [nano, setNano] = useState<'ok' | 'off' | 'checking'>('checking');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/ai/health')
      .then(async (res) => {
        if (!res.ok) throw new Error('health failed');
        const data = await res.json();
        const badges: CloudBadge[] = (data.providers || [])
          .filter((p: any) => p.id === 'mistral' || p.id === 'openrouter')
          .map((p: any) => ({
            id: p.id,
            label: p.id === 'mistral' ? 'Mistral' : 'OpenRouter',
            state: p.available ? 'ok' : 'warn',
            title: p.available
              ? `${p.name} reachable (${p.model})`
              : `${p.name} unreachable${p.detail ? ` — ${p.detail}` : ''}`,
          }));
        if (!cancelled) setCloud(badges);
      })
      .catch(() => {
        if (!cancelled) setCloud([]);
      });

    // Gemini Nano (Chrome on-device) detection — browser only, no key.
    try {
      const g = globalThis as any;
      if (!g.LanguageModel?.availability) {
        setNano('off');
      } else {
        g.LanguageModel.availability({ expectedOutputs: [{ type: 'text', languages: ['en'] }] })
          .then((a: string) => {
            if (!cancelled) setNano(a === 'unavailable' ? 'off' : 'ok');
          })
          .catch(() => {
            if (!cancelled) setNano('off');
          });
      }
    } catch {
      setNano('off');
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const dot = (state: 'ok' | 'warn' | 'off' | 'checking') =>
    state === 'ok' ? 'bg-green-500' : state === 'warn' ? 'bg-yellow-500' : state === 'checking' ? 'bg-gray-300 animate-pulse' : 'bg-gray-300';

  const pill = (state: 'ok' | 'warn' | 'off' | 'checking') =>
    state === 'ok'
      ? 'bg-green-50 border-green-200 text-green-700'
      : state === 'warn'
        ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
        : 'bg-gray-50 border-gray-200 text-gray-500';

  const items: { label: string; state: 'ok' | 'warn' | 'off' | 'checking'; title: string }[] = [
    ...(cloud || []).map((c) => ({ label: c.label, state: c.state, title: c.title })),
    {
      label: 'Nano',
      state: nano,
      title:
        nano === 'ok'
          ? 'Gemini Nano on-device AI ready in this browser'
          : nano === 'checking'
            ? 'Checking on-device AI…'
            : 'Gemini Nano not available in this browser (needs Chrome with on-device AI)',
    },
  ];

  if (cloud === null) {
    return (
      <div className="flex items-center gap-1.5" title="Checking AI providers…">
        {['Mistral', 'OpenRouter', 'Nano'].map((l) => (
          <span key={l} className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
            {l}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {items.map((item) => (
        <span
          key={item.label}
          title={item.title}
          className={`flex items-center gap-1 px-2 py-1 border rounded-lg text-xs font-medium ${pill(item.state)}`}
        >
          <span className={`w-2 h-2 rounded-full ${dot(item.state)}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
