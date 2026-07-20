import { setToken, getToken, initFromServer, clearCache } from './storage';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

let _user: AuthUser | null = null;

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export function getUser(): AuthUser | null { return _user; }
export function isAuthenticated(): boolean { return _user !== null && getToken() !== null; }

export async function checkAuth(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const r = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) { setToken(null); return null; }
    _user = await r.json() as AuthUser;
    return _user;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const r = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Login failed.');
  setToken(data.token as string);
  _user = data.user as AuthUser;
  await initFromServer();
  return _user;
}

export async function register(name: string, email: string, password: string): Promise<AuthUser> {
  const r = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Registration failed.');
  setToken(data.token as string);
  _user = data.user as AuthUser;
  await initFromServer();
  return _user;
}

export function logout() {
  _user = null;
  clearCache();
}
