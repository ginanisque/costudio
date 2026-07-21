import React, { useCallback, useEffect, useRef, useState } from 'react';
import Header from './Header';
import SettingsPortal from './SettingsPortal';

// Read once — import.meta.env is static after build
// Production AI calls run in a Supabase Edge Function so the OpenAI key never
// reaches the browser. VITE_API_URL remains available for the local Node server.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
  || (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/costudio-ai` : '');
const apiUrl = (path: string) => `${API_BASE}${path}`;

const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; hasKey?: boolean; error?: string } | null>(null);
  const [hideGuide, setHideGuide] = useState(false);

  // Use a ref so refreshStatus never changes identity but always has fresh state setter
  const setStatusRef = useRef(setStatus);
  setStatusRef.current = setStatus;

  const refreshStatus = useCallback(async () => {
    try {
      const r = await fetch(apiUrl('/api/status'));
      const text = await r.text();
      let body: { hasKey?: boolean } = {};
      try { body = text ? (JSON.parse(text) as typeof body) : {}; } catch { /* ignore */ }
      setStatusRef.current({ ok: r.ok, hasKey: !!body?.hasKey, error: r.ok ? undefined : `HTTP ${r.status}` });
    } catch {
      setStatusRef.current({ ok: false, error: 'API offline or proxy misconfigured' });
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (open) refreshStatus();
  }, [open, refreshStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <Header onOpenSettings={() => setOpen(true)} />
      {!hideGuide && status && (!status.ok || !status.hasKey) && (
        <div className="container mx-auto px-4 pt-4">
          <div className="relative rounded-md border bg-white p-4 text-sm shadow-sm">
            <button
              type="button"
              aria-label="Dismiss"
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              onClick={() => setHideGuide(true)}
            >
              ×
            </button>
            <div className="font-medium mb-1">AI assistant unavailable</div>
            <div className="text-slate-600 mb-2">
              {status.ok
                ? 'The Design workspace is online, but its server-side OpenAI key has not been configured.'
                : 'Design, costing, and client management remain available. AI writing and image tools need the Costudio server function.'}
            </div>
            <p className="text-slate-700">
              The OpenAI key belongs in Supabase Edge Function Secrets, never in this page or a browser-exposed Vite variable.
            </p>
            <div className="mt-3">
              <button type="button" className="inline-flex items-center px-3 py-1.5 text-sm border rounded" onClick={refreshStatus}>
                Recheck
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <SettingsPortal open={open} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Settings</h2>
          <div className="text-sm text-muted-foreground">
            OpenAI access is provided by the Costudio Supabase Edge Function. Never paste an API key into the browser.
          </div>
          <div className="rounded border p-3 bg-white">
            <div className="font-medium mb-2">Server Status</div>
            <div className="text-sm space-y-1">
              <div>API server: {status?.ok ? <span className="text-green-600">Online</span> : <span className="text-red-600">Offline</span>}</div>
              <div>OpenAI key: {status?.hasKey ? <span className="text-green-600">Detected</span> : <span className="text-red-600">Not detected</span>}</div>
              {status?.error && <div className="text-red-600">{status.error}</div>}
            </div>
            <button type="button" className="mt-3 inline-flex items-center px-3 py-1.5 text-sm border rounded" onClick={refreshStatus}>
              Recheck
            </button>
          </div>
          <div className="rounded border p-3 bg-white space-y-2 text-sm">
            <div className="font-medium">Production configuration</div>
            <p>Add <code>OPENAI_API_KEY</code> under Supabase Edge Function Secrets, then deploy the <code>costudio-ai</code> function.</p>
          </div>
          <div className="flex justify-end">
            <button type="button" className="inline-flex items-center px-4 py-2 border rounded" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      </SettingsPortal>
    </div>
  );
};

export default AppLayout;
