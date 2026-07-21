import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { checkAuth } from '@/utils/auth';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  async function refresh() {
    const user = await checkAuth();
    setSignedIn(Boolean(user));
    setReady(true);
  }

  useEffect(() => {
    void refresh();
    const subscription = supabase?.auth.onAuthStateChange(() => { void refresh(); });
    return () => subscription?.data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready || signedIn) return;
    const next = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(`/auth.html?next=${encodeURIComponent(next)}`);
  }, [ready, signedIn]);

  if (!supabaseConfigured) {
    return <div className="min-h-screen grid place-items-center p-6 text-center">Supabase authentication is not configured.</div>;
  }
  if (!ready) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading your business workspace…</div>;
  }
  if (!signedIn) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Taking you to Costudio sign inâ€¦</div>;
  return <>{children}</>;
}
