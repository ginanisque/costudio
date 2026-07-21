import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { checkAuth } from '@/utils/auth';
import { COMPETITION_DEMO } from '@/config/mode';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    let user = await checkAuth();
    if (!user && supabase && COMPETITION_DEMO) {
      const result = await supabase.auth.signInAnonymously({
        options: { data: { business_name: 'Costudio Demo', display_name: 'Demo Designer' } },
      });
      if (result.error) setError(result.error.message);
      else user = await checkAuth();
    }
    setSignedIn(Boolean(user));
    setReady(true);
  }

  useEffect(() => {
    void refresh();
    const subscription = supabase?.auth.onAuthStateChange(() => { void refresh(); });
    return () => subscription?.data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (COMPETITION_DEMO || !ready || signedIn) return;
    const next = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(`/auth.html?next=${encodeURIComponent(next)}`);
  }, [ready, signedIn]);

  if (!supabaseConfigured) {
    return <div className="min-h-screen grid place-items-center p-6 text-center">Supabase authentication is not configured.</div>;
  }
  if (!ready) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading your business workspace…</div>;
  }
  if (!signedIn) return <div className="min-h-screen grid place-items-center p-6 text-center text-sm text-muted-foreground">{COMPETITION_DEMO ? `Competition demo could not start. ${error || 'Enable anonymous sign-ins in Supabase Auth settings.'}` : 'Taking you to Costudio sign in…'}</div>;
  return <>{children}</>;
}
