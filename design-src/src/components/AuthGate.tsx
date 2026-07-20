import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { checkAuth } from '@/utils/auth';
import { LoginModal } from './LoginModal';

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

  if (!supabaseConfigured) {
    return <div className="min-h-screen grid place-items-center p-6 text-center">Supabase authentication is not configured.</div>;
  }
  if (!ready) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading your business workspace…</div>;
  }
  if (!signedIn) return <LoginModal onSuccess={() => void refresh()} />;
  return <>{children}</>;
}
