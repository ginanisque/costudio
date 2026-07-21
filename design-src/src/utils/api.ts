import { retry } from "./backoff";
import { supabase } from "@/lib/supabase";

// Prefer absolute API base if provided (works without dev proxy)
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
  || (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/costudio-ai` : '');
const api = (path: string) => `${API_BASE}${path}`;

async function apiFetch(path: string, init: RequestInit = {}) {
  const { data } = await supabase!.auth.getSession();
  const accessToken = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(api(path), { ...init, headers });
}


export type CollectionReferences = {
  fabricImages?: string[];
  styleImages?: string[];
  modelImages?: string[];
};

export type GeneratePayload = CollectionReferences & {
  prompt: string;
  size?: "256x256" | "512x512" | "1024x1024";
};


export async function generateImageViaProxy(payload: GeneratePayload): Promise<{ b64: string }> {
return retry(async () => {
const r = await apiFetch("/api/generate", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload),
});
const body = await r.json();
if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
if (!body?.b64) throw new Error("Empty image body");
return body as { b64: string };
}, { attempts: 4, baseDelayMs: 400, maxDelayMs: 3000 });
}

export async function generateDesignerProfile(payload: Record<string, unknown>): Promise<{ profile: string }> {
  return retry(async () => {
    const r = await apiFetch("/api/generate-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "designer_profile", payload }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
    return body as { profile: string };
  });
}

export async function generateCollectionCopy(payload: Record<string, unknown>): Promise<{ title: string; description: string }> {
  return retry(async () => {
    const r = await apiFetch("/api/generate-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "collection_description", payload }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
    return body as { title: string; description: string };
  });
}

export async function generateInspiration(text: string): Promise<{ inspiration: string }> {
  const r = await apiFetch("/api/generate-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "inspiration", payload: { text } }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
  // Normalize different return shapes
  const insp = body?.inspiration || body?.profile || (typeof body === 'string' ? body : JSON.stringify(body));
  return { inspiration: insp };
}

export type SocialPack = { tweet: string; instagram: { caption: string; hashtags: string[] }; press_blurb: string; headline: string };
export async function generateSocialPack(payload: { name?: string; inspiration?: string; palette?: string[] }): Promise<SocialPack> {
  const r = await apiFetch("/api/generate-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "social_pack", payload }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
  return body as SocialPack;
}

export async function improveProductContent(payload: {
  title?: string;
  description?: string;
  collectionName?: string;
  collectionInspiration?: string;
}): Promise<{ title: string; description: string }> {
  const r = await apiFetch('/api/generate-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'product_description', payload }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
  return body as { title: string; description: string };
}

export async function suggestPrompts(
  description: string,
  images: string[] = [],
  count = 8,
  references: CollectionReferences = {},
): Promise<string[]> {
  return retry(async () => {
    const legacyImages = images.length
      ? images
      : [...(references.fabricImages || []), ...(references.styleImages || []), ...(references.modelImages || [])].slice(0, 4);
    const r = await apiFetch("/api/suggest-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, images: legacyImages, count, ...references }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      const raw: unknown = body && (body.error ?? body);
      const msg = typeof raw === 'string'
        ? raw
        : (raw as { message?: string })?.message ?? JSON.stringify(raw ?? {});
      throw new Error(`${r.status} ${r.statusText || ''} ${msg}`.trim());
    }
    return (body?.prompts as string[]) || [];
  }, { attempts: 2, baseDelayMs: 300, maxDelayMs: 1500 });
}

export type InspireItem = { title: string; url: string; thumb: string; w?: number; h?: number; license?: string };
export async function fetchInspirationImages(query: string, count = 12): Promise<InspireItem[]> {
  const r = await apiFetch(`/api/inspire?q=${encodeURIComponent(query)}&count=${count}`);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
  return (body?.items as InspireItem[]) || [];
}
