import { supabase } from '@/lib/supabase';
import { initFromServer, clearCache, setBusinessId } from './storage';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  businessId: string;
  businessName: string;
  businessDefaults: {
    legalName: string;
    email: string;
    phone: string;
    secondPhone: string;
    website: string;
    address: string;
    logo: string;
    currencyCode: string;
    currencySymbol: string;
    materialUnit: 'm' | 'yd';
    measurementUnit: 'cm' | 'in';
  };
};

export type BusinessWorkspace = {
  id: string;
  name: string;
  role: string;
};

const ACTIVE_WORKSPACE_KEY = 'costudio.activeBusinessId';

let _user: AuthUser | null = null;

export function getUser(): AuthUser | null { return _user; }
export function isAuthenticated(): boolean { return _user !== null; }

async function resolveUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data: authData } = await supabase.auth.getUser();
  const account = authData.user;
  if (!account) return null;
  const { data: memberships, error } = await supabase
    .from('business_members')
    .select('business_id,role,created_at')
    .eq('user_id', account.id)
    .order('created_at', { ascending: true });
  if (error || !memberships?.length) return null;
  const preferredId = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
  const membership = memberships.find(item => item.business_id === preferredId) || memberships[0];
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', membership.business_id)
    .single();
  const accountEmail = account.email || 'demo@costudio.local';
  const businessName = business?.name || account.user_metadata?.business_name || accountEmail.split('@')[0];
  const address = [business?.address_line_1, business?.address_line_2, business?.city, business?.state_region, business?.postal_code, business?.country_code]
    .filter(Boolean)
    .join(', ');
  setBusinessId(membership.business_id);
  return {
    id: account.id,
    email: accountEmail,
    name: account.user_metadata?.display_name || businessName,
    businessId: membership.business_id,
    businessName,
    businessDefaults: {
      legalName: business?.legal_name || '',
      email: business?.business_email || accountEmail,
      phone: business?.phone_primary || '',
      secondPhone: business?.phone_secondary || '',
      website: business?.website || '',
      address,
      logo: business?.logo_data_url || '',
      currencyCode: business?.currency_code || 'USD',
      currencySymbol: business?.currency_symbol || '$',
      materialUnit: business?.measurement_unit === 'yd' ? 'yd' : 'm',
      measurementUnit: business?.measurement_record_unit === 'in' ? 'in' : 'cm',
    },
  };
}

export async function listWorkspaces(): Promise<BusinessWorkspace[]> {
  if (!supabase) return [];
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];
  const { data: memberships } = await supabase
    .from('business_members')
    .select('business_id,role,created_at')
    .eq('user_id', authData.user.id)
    .order('created_at', { ascending: true });
  if (!memberships?.length) return [];
  const ids = memberships.map(item => item.business_id);
  const { data: businesses } = await supabase.from('businesses').select('id,name').in('id', ids);
  const names = new Map((businesses || []).map(item => [item.id, item.name]));
  return memberships.map(item => ({ id: item.business_id, name: names.get(item.business_id) || 'Costudio', role: item.role }));
}

export function switchWorkspace(businessId: string) {
  localStorage.setItem(ACTIVE_WORKSPACE_KEY, businessId);
  window.location.reload();
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
    options: { emailRedirectTo: `${window.location.origin}/design/`, data: { business_name: businessName, display_name: businessName } },
  });
  if (error) throw error;
  if (!data.session) throw new Error('Check your email to confirm the account, then sign in.');
  _user = await resolveUser();
  if (!_user) throw new Error('Your business workspace could not be created. Check the Supabase migration.');
  await initFromServer();
  return _user;
}

export async function resendConfirmation(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.resend({
    type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/design/` },
  });
  if (error) throw error;
}

export async function logout() {
  if (supabase) await supabase.auth.signOut();
  _user = null;
  setBusinessId(null);
  clearCache();
}
