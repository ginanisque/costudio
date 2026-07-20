import { supabase } from '@/lib/supabase';
import { initFromServer, clearCache, setBusinessId } from './storage';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  businessId: string;
  businessName: string;
};

let _user: AuthUser | null = null;

export function getUser(): AuthUser | null { return _user; }
export function isAuthenticated(): boolean { return _user !== null; }

async function resolveUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data: authData } = await supabase.auth.getUser();
  const account = authData.user;
  if (!account?.email) return null;
  const { data: membership, error } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', account.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !membership?.business_id) return null;
  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', membership.business_id)
    .single();
  const businessName = business?.name || account.user_metadata?.business_name || account.email.split('@')[0];
  setBusinessId(membership.business_id);
  return {
    id: account.id,
    email: account.email,
    name: account.user_metadata?.display_name || businessName,
    businessId: membership.business_id,
    businessName,
  };
}

export async function checkAuth(): Promise<AuthUser | null> {
  _user = await resolveUser();
  if (_user) await initFromServer();
  return _user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  _user = await resolveUser();
  if (!_user) throw new Error('Your business workspace is not ready. Run the Costudio Supabase migration.');
  await initFromServer();
  return _user;
}

export async function register(businessName: string, email: string, password: string): Promise<AuthUser> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { business_name: businessName, display_name: businessName } },
  });
  if (error) throw error;
  if (!data.session) throw new Error('Check your email to confirm the account, then sign in.');
  _user = await resolveUser();
  if (!_user) throw new Error('Your business workspace could not be created. Check the Supabase migration.');
  await initFromServer();
  return _user;
}

export async function logout() {
  if (supabase) await supabase.auth.signOut();
  _user = null;
  setBusinessId(null);
  clearCache();
}
