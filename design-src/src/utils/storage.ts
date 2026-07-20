export type StoredDesigner = {
  id: string;
  profile: Record<string, unknown>;
  polishedProfile?: string;
  createdAt: string;
  name?: string;
};

export type StoredCollection = {
  id: string;
  data: Record<string, unknown>;
  title?: string;
  description?: string;
  prompts?: string[];
  createdAt: string;
  paletteId?: string;
  fabricIds?: string[];
  promptSetId?: string;
  modelIds?: string[];
  moodboardId?: string;
};

export type StoredPalette = {
  id: string;
  name: string;
  colors: string[];
  createdAt: string;
};

export type StoredFabric = {
  id: string;
  name: string;
  description?: string;
  content?: string;
  flow?: 'firm' | 'soft' | 'flowing' | 'stiff';
  image?: string;
  createdAt: string;
};

export type StoredPromptSet = {
  id: string;
  name: string;
  items: string[];
  collectionId?: string;
  createdAt: string;
};

export type StoredPiece = {
  id: string;
  seq: number;
  collectionId?: string;
  prompt: string;
  size?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
};

export type InboxItem = {
  id: string;
  prompt: string;
  collectionId?: string;
  receivedAt: string;
};

export type StoredNote = {
  id: string;
  collectionId: string;
  title?: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
};

export type ChatMessage = {
  id: string;
  author?: string;
  text: string;
  ts: string;
  self?: boolean;
};

export type StoredMoodboard = {
  id: string;
  name: string;
  notes?: string;
  images: string[];
  createdAt: string;
  updatedAt?: string;
  collectionId?: string;
};

// ── localStorage keys (used as fallback when not authenticated) ──
const D_KEY        = 'fashionAI.designers';
const C_KEY        = 'fashionAI.collections';
const P_KEY        = 'fashionAI.palettes';
const F_KEY        = 'fashionAI.fabrics';
const PS_KEY       = 'fashionAI.prompts';
const PIECE_KEY    = 'fashionAI.pieces';
const PIECE_SEQ_KEY = 'fashionAI.pieceSeq';
const INBOX_KEY    = 'fashionAI.inbox';
const NOTES_KEY    = 'fashionAI.notes';
const MB_KEY       = 'fashionAI.moodboards';
const MSG_KEY_PREFIX  = 'fashionAI.msg.';
const PEER_SEEN_PREFIX = 'fashionAI.seen.';
const MSG_OPEN_PREFIX  = 'fashionAI.msg.open.';
const TYPING_PREFIX    = 'fashionAI.typing.';

// ── Helpers ──────────────────────────────────────────────────

function slugify(s: string) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
}

export function computeDesignerId(profile: Record<string, unknown>): string {
  return `designer:${slugify((profile?.name as string) || 'unnamed') || 'unnamed'}`;
}

export function computeCollectionId(data: Record<string, unknown>): string {
  const base = `${(data?.name as string) || 'collection'}-${(data?.launchYear as string) || ''}`;
  return `collection:${slugify(base) || 'collection'}`;
}

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch { return []; }
}

function writeArray<T>(key: string, arr: T[]) {
  try { localStorage.setItem(key, JSON.stringify(arr)); } catch { /* ignore */ }
}

function readNumber(key: string, fallback = 0): number {
  try { const v = localStorage.getItem(key); return v ? Number(v) || fallback : fallback; }
  catch { return fallback; }
}

function writeNumber(key: string, n: number) {
  try { localStorage.setItem(key, String(n)); } catch { /* ignore */ }
}

// ── Auth token ────────────────────────────────────────────────

let _token: string | null = localStorage.getItem('fashionAI.token');

export function getToken(): string | null { return _token; }
export function setToken(t: string | null) {
  _token = t;
  if (t) localStorage.setItem('fashionAI.token', t);
  else localStorage.removeItem('fashionAI.token');
}

// ── In-memory cache (populated after login) ───────────────────

const cache = {
  designers:  [] as StoredDesigner[],
  collections: [] as StoredCollection[],
  palettes:   [] as StoredPalette[],
  fabrics:    [] as StoredFabric[],
  pieces:     [] as StoredPiece[],
  notes:      [] as StoredNote[],
  promptSets: [] as StoredPromptSet[],
  moodboards: [] as StoredMoodboard[],
  pieceSeq:   0,
  ready:      false,
};

// ── API helpers ───────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

async function apiFetch(path: string, opts: RequestInit = {}): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  try {
    const r = await fetch(API_BASE + path, {
      ...opts,
      headers: { ...headers, ...(opts.headers as Record<string, string> || {}) },
    });
    if (r.status === 401) { setToken(null); cache.ready = false; }
    return r.ok ? r.json() : null;
  } catch { return null; }
}

function serverSave(type: string, entity: unknown) {
  if (!_token) return;
  const clientId = (entity as { id?: string }).id;
  if (!clientId) return;
  apiFetch(`/api/data/${type}`, {
    method: 'POST',
    body: JSON.stringify({ client_id: clientId, data: entity }),
  });
}

function serverDelete(type: string, clientId: string) {
  if (!_token) return;
  apiFetch(`/api/data/${type}/${encodeURIComponent(clientId)}`, { method: 'DELETE' });
}

// ── Server init / cache clear ─────────────────────────────────

export async function initFromServer(): Promise<void> {
  const types = ['designers', 'collections', 'palettes', 'fabrics', 'pieces', 'notes', 'promptsets', 'moodboards'];
  const results = await Promise.all(types.map(t => apiFetch(`/api/data/${t}`)));
  const [designers, collections, palettes, fabrics, pieces, notes, promptsets, moodboards] = results as Array<{ items: Array<{ data: unknown }> } | null>;

  cache.designers   = (designers?.items   || []).map(r => r.data as StoredDesigner);
  cache.collections = (collections?.items || []).map(r => r.data as StoredCollection);
  cache.palettes    = (palettes?.items    || []).map(r => r.data as StoredPalette);
  cache.fabrics     = (fabrics?.items     || []).map(r => r.data as StoredFabric);
  cache.pieces      = (pieces?.items      || []).map(r => r.data as StoredPiece);
  cache.notes       = (notes?.items       || []).map(r => r.data as StoredNote);
  cache.promptSets  = (promptsets?.items  || []).map(r => r.data as StoredPromptSet);
  cache.moodboards  = (moodboards?.items  || []).map(r => r.data as StoredMoodboard);
  cache.pieceSeq    = cache.pieces.reduce((m, p) => Math.max(m, p.seq || 0), 0);
  cache.ready       = true;
}

export function clearCache() {
  cache.designers = []; cache.collections = []; cache.palettes = [];
  cache.fabrics = []; cache.pieces = []; cache.notes = [];
  cache.promptSets = []; cache.moodboards = [];
  cache.pieceSeq = 0; cache.ready = false;
  setToken(null);
}

// ── Designers ─────────────────────────────────────────────────

export function listDesigners(): StoredDesigner[] {
  if (cache.ready) return [...cache.designers];
  const arr = readArray<StoredDesigner>(D_KEY);
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const out: StoredDesigner[] = [];
  const norm = (d: StoredDesigner) => slugify((d?.name || (d.profile?.name as string) || 'unnamed'));
  for (const d of arr) {
    if (!d) continue;
    const id = d.id || computeDesignerId(d?.profile ?? {});
    const nameSlug = norm(d);
    if (seenIds.has(id) || (nameSlug && seenNames.has(nameSlug))) continue;
    const fixed: StoredDesigner = {
      id, profile: d?.profile ?? {}, polishedProfile: d?.polishedProfile,
      createdAt: d?.createdAt || new Date().toISOString(),
      name: d?.name || (d.profile?.name as string) || undefined,
    };
    out.push(fixed);
    seenIds.add(id);
    if (nameSlug) seenNames.add(nameSlug);
  }
  if (out.length !== arr.length) writeArray(D_KEY, out);
  return out;
}

export function saveDesigner(d: StoredDesigner) {
  const id = d?.id || computeDesignerId(d?.profile);
  d.id = id;
  if (cache.ready) {
    const idx = cache.designers.findIndex(x => x.id === id);
    if (idx >= 0) cache.designers[idx] = d; else cache.designers.unshift(d);
    serverSave('designers', d);
  } else {
    const list = listDesigners();
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) list[idx] = d; else list.unshift(d);
    writeArray(D_KEY, list);
  }
}

// ── Collections ───────────────────────────────────────────────

export function listCollections(): StoredCollection[] {
  if (cache.ready) return [...cache.collections];
  return readArray<StoredCollection>(C_KEY);
}

export function saveCollection(c: StoredCollection) {
  const id = c?.id || computeCollectionId(c?.data);
  c.id = id;
  if (cache.ready) {
    const idx = cache.collections.findIndex(x => x.id === id);
    if (idx >= 0) cache.collections[idx] = c; else cache.collections.unshift(c);
    serverSave('collections', c);
  } else {
    const list = listCollections();
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) list[idx] = c; else list.unshift(c);
    writeArray(C_KEY, list);
  }
}

export function updateCollection(id: string, patch: Partial<StoredCollection>) {
  if (cache.ready) {
    const idx = cache.collections.findIndex(x => x.id === id);
    if (idx >= 0) {
      cache.collections[idx] = { ...cache.collections[idx], ...patch } as StoredCollection;
      serverSave('collections', cache.collections[idx]);
      return cache.collections[idx];
    }
    return null;
  }
  const list = readArray<StoredCollection>(C_KEY);
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch } as StoredCollection;
    writeArray(C_KEY, list);
    return list[idx];
  }
  return null;
}

// ── Palettes ──────────────────────────────────────────────────

export function computePaletteId(name: string) { return `palette:${slugify(name || 'palette')}`; }

export function listPalettes(): StoredPalette[] {
  if (cache.ready) return [...cache.palettes];
  return readArray<StoredPalette>(P_KEY);
}

export function savePalette(p: StoredPalette) {
  const id = p?.id || computePaletteId(p?.name);
  p.id = id;
  if (cache.ready) {
    const idx = cache.palettes.findIndex(x => x.id === id);
    if (idx >= 0) cache.palettes[idx] = p; else cache.palettes.unshift(p);
    serverSave('palettes', p);
  } else {
    const list = listPalettes();
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) list[idx] = p; else list.unshift(p);
    writeArray(P_KEY, list);
  }
}

export function removePalette(id: string) {
  if (cache.ready) {
    cache.palettes = cache.palettes.filter(p => p.id !== id);
    serverDelete('palettes', id);
  } else {
    writeArray(P_KEY, readArray<StoredPalette>(P_KEY).filter(p => p.id !== id));
  }
}

export function renamePalette(id: string, name: string) {
  if (cache.ready) {
    const idx = cache.palettes.findIndex(p => p.id === id);
    if (idx >= 0) { cache.palettes[idx].name = name; serverSave('palettes', cache.palettes[idx]); }
  } else {
    const list = readArray<StoredPalette>(P_KEY);
    const idx = list.findIndex(p => p.id === id);
    if (idx >= 0) { list[idx].name = name; writeArray(P_KEY, list); }
  }
}

// ── Fabrics ───────────────────────────────────────────────────

export function computeFabricId(name: string) { return `fabric:${slugify(name || 'fabric')}`; }

export function listFabrics(): StoredFabric[] {
  if (cache.ready) return [...cache.fabrics];
  return readArray<StoredFabric>(F_KEY);
}

export function saveFabric(f: StoredFabric) {
  const id = f?.id || computeFabricId(f?.name);
  f.id = id;
  if (cache.ready) {
    const idx = cache.fabrics.findIndex(x => x.id === id);
    if (idx >= 0) cache.fabrics[idx] = f; else cache.fabrics.unshift(f);
    serverSave('fabrics', f);
  } else {
    const list = listFabrics();
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) list[idx] = f; else list.unshift(f);
    writeArray(F_KEY, list);
  }
}

export function removeFabric(id: string) {
  if (cache.ready) {
    cache.fabrics = cache.fabrics.filter(f => f.id !== id);
    serverDelete('fabrics', id);
  } else {
    writeArray(F_KEY, readArray<StoredFabric>(F_KEY).filter(f => f.id !== id));
  }
}

export function renameFabric(id: string, name: string) {
  if (cache.ready) {
    const idx = cache.fabrics.findIndex(f => f.id === id);
    if (idx >= 0) { cache.fabrics[idx].name = name; serverSave('fabrics', cache.fabrics[idx]); }
  } else {
    const list = readArray<StoredFabric>(F_KEY);
    const idx = list.findIndex(f => f.id === id);
    if (idx >= 0) { list[idx].name = name; writeArray(F_KEY, list); }
  }
}

// ── Prompt sets ───────────────────────────────────────────────

export function computePromptSetId(name: string) { return `prompts:${slugify(name || 'prompts')}`; }

export function listPromptSets(): StoredPromptSet[] {
  if (cache.ready) return [...cache.promptSets];
  return readArray<StoredPromptSet>(PS_KEY);
}

export function savePromptSet(ps: StoredPromptSet) {
  const id = ps?.id || computePromptSetId(ps?.name);
  ps.id = id;
  if (cache.ready) {
    const idx = cache.promptSets.findIndex(x => x.id === id);
    if (idx >= 0) cache.promptSets[idx] = ps; else cache.promptSets.unshift(ps);
    serverSave('promptsets', ps);
  } else {
    const list = listPromptSets();
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) list[idx] = ps; else list.unshift(ps);
    writeArray(PS_KEY, list);
  }
}

export function removePromptSet(id: string) {
  if (cache.ready) {
    cache.promptSets = cache.promptSets.filter(p => p.id !== id);
    serverDelete('promptsets', id);
  } else {
    writeArray(PS_KEY, readArray<StoredPromptSet>(PS_KEY).filter(p => p.id !== id));
  }
}

export function renamePromptSet(id: string, name: string) {
  if (cache.ready) {
    const idx = cache.promptSets.findIndex(p => p.id === id);
    if (idx >= 0) { cache.promptSets[idx].name = name; serverSave('promptsets', cache.promptSets[idx]); }
  } else {
    const list = readArray<StoredPromptSet>(PS_KEY);
    const idx = list.findIndex(p => p.id === id);
    if (idx >= 0) { list[idx].name = name; writeArray(PS_KEY, list); }
  }
}

// ── Pieces ────────────────────────────────────────────────────

function hash8(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) + input.charCodeAt(i);
  const x = (h >>> 0).toString(16);
  return ('00000000' + x).slice(-8);
}

export function computePieceId(collectionOrSlug: string, seq: number) {
  const slug = slugify(collectionOrSlug || 'collection');
  return `piece:${hash8(`${slug}:${seq}`)}`;
}

export function nextPieceSeq(): number {
  if (cache.ready) { cache.pieceSeq += 1; return cache.pieceSeq; }
  const cur = readNumber(PIECE_SEQ_KEY, 0) + 1;
  writeNumber(PIECE_SEQ_KEY, cur);
  return cur;
}

export function listPieces(): StoredPiece[] {
  if (cache.ready) return [...cache.pieces];
  return readArray<StoredPiece>(PIECE_KEY);
}

export function savePiece(p: StoredPiece) {
  if (cache.ready) {
    const idx = cache.pieces.findIndex(x => x.id === p.id);
    if (idx >= 0) cache.pieces[idx] = { ...cache.pieces[idx], ...p, updatedAt: new Date().toISOString() };
    else cache.pieces.unshift({ ...p });
    serverSave('pieces', cache.pieces[idx >= 0 ? idx : 0]);
  } else {
    const list = listPieces();
    const idx = list.findIndex(x => x.id === p.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...p, updatedAt: new Date().toISOString() };
    else list.unshift({ ...p });
    writeArray(PIECE_KEY, list);
  }
}

export function updatePiece(id: string, patch: Partial<StoredPiece>) {
  if (cache.ready) {
    const idx = cache.pieces.findIndex(x => x.id === id);
    if (idx >= 0) {
      cache.pieces[idx] = { ...cache.pieces[idx], ...patch, updatedAt: new Date().toISOString() } as StoredPiece;
      serverSave('pieces', cache.pieces[idx]);
      return cache.pieces[idx];
    }
    return null;
  }
  const list = readArray<StoredPiece>(PIECE_KEY);
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() } as StoredPiece;
    writeArray(PIECE_KEY, list);
    return list[idx];
  }
  return null;
}

export function listPiecesByCollection(collectionId: string): StoredPiece[] {
  return listPieces().filter(p => p.collectionId === collectionId);
}

// ── Inbox (ephemeral — stays localStorage) ────────────────────

export function listInbox(): InboxItem[] { return readArray<InboxItem>(INBOX_KEY); }

export function addToInbox(items: { id: string; prompt: string; collectionId?: string }[]) {
  if (!Array.isArray(items) || items.length === 0) return;
  const now = new Date().toISOString();
  const existing = listInbox();
  const map = new Map(existing.map(i => [i.id, i]));
  for (const it of items) {
    map.set(it.id, { id: it.id, prompt: it.prompt, collectionId: it.collectionId, receivedAt: now });
  }
  writeArray(INBOX_KEY, Array.from(map.values()));
}

export function clearInbox() { writeArray(INBOX_KEY, []); }

// ── Notes ─────────────────────────────────────────────────────

function computeNoteId(title: string) {
  return `note:${slugify(title || 'note')}-${Math.random().toString(36).slice(2, 7)}`;
}

export function listNotesByCollection(collectionId: string): StoredNote[] {
  if (cache.ready) return cache.notes.filter(n => n.collectionId === collectionId);
  return readArray<StoredNote>(NOTES_KEY).filter(n => n.collectionId === collectionId);
}

export function saveNote(n: Omit<StoredNote, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) {
  const now = new Date().toISOString();
  const id = n.id || computeNoteId(n.title || '');
  const note: StoredNote = { id, collectionId: n.collectionId, title: n.title, body: n.body, createdAt: n.createdAt || now, updatedAt: now };
  if (cache.ready) {
    const idx = cache.notes.findIndex(x => x.id === id);
    if (idx >= 0) cache.notes[idx] = note; else cache.notes.unshift(note);
    serverSave('notes', note);
  } else {
    const list = readArray<StoredNote>(NOTES_KEY);
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) list[idx] = note; else list.unshift(note);
    writeArray(NOTES_KEY, list);
  }
  return note;
}

export function updateNote(id: string, patch: Partial<StoredNote>) {
  if (cache.ready) {
    const idx = cache.notes.findIndex(x => x.id === id);
    if (idx >= 0) {
      cache.notes[idx] = { ...cache.notes[idx], ...patch, updatedAt: new Date().toISOString() } as StoredNote;
      serverSave('notes', cache.notes[idx]);
      return cache.notes[idx];
    }
    return null;
  }
  const list = readArray<StoredNote>(NOTES_KEY);
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() } as StoredNote;
    writeArray(NOTES_KEY, list);
    return list[idx];
  }
  return null;
}

export function removeNote(id: string) {
  if (cache.ready) {
    cache.notes = cache.notes.filter(n => n.id !== id);
    serverDelete('notes', id);
  } else {
    writeArray(NOTES_KEY, readArray<StoredNote>(NOTES_KEY).filter(n => n.id !== id));
  }
}

// ── Messages per room (ephemeral — stays localStorage) ────────

export function listMessages(room: string): ChatMessage[] {
  return readArray<ChatMessage>(MSG_KEY_PREFIX + (room || 'default'));
}
export function addMessage(room: string, m: ChatMessage) {
  const key = MSG_KEY_PREFIX + (room || 'default');
  const arr = readArray<ChatMessage>(key);
  arr.push(m);
  writeArray(key, arr);
}
export function clearMessages(room: string) {
  writeArray(MSG_KEY_PREFIX + (room || 'default'), []);
}

// ── Peer last-seen per room (ephemeral) ───────────────────────

export function listPeerSeen(room: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(PEER_SEEN_PREFIX + (room || 'default'));
    return raw ? JSON.parse(raw) as Record<string, string> : {};
  } catch { return {}; }
}

export function setPeerSeen(room: string, name: string, ts: string) {
  const key = PEER_SEEN_PREFIX + (room || 'default');
  const map = listPeerSeen(room);
  if (!name) return;
  if (!map[name] || new Date(ts).getTime() > new Date(map[name]).getTime()) {
    map[name] = ts;
    try { localStorage.setItem(key, JSON.stringify(map)); } catch { /* ignore */ }
  }
}

// ── Last-opened timestamps (ephemeral) ───────────────────────

export function getLastOpenTs(room: string): string | null {
  try { return localStorage.getItem(MSG_OPEN_PREFIX + (room || 'default')); } catch { return null; }
}
export function setLastOpenTs(room: string, ts: string) {
  try { localStorage.setItem(MSG_OPEN_PREFIX + (room || 'default'), ts); } catch { /* ignore */ }
}

// ── Typing indicators per room (ephemeral) ────────────────────

export function listTyping(room: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(TYPING_PREFIX + (room || 'default'));
    const data = raw ? JSON.parse(raw) as Record<string, number> : {};
    const now = Date.now();
    const out: Record<string, number> = {};
    for (const k of Object.keys(data)) if (data[k] > now) out[k] = data[k];
    if (JSON.stringify(out) !== JSON.stringify(data))
      localStorage.setItem(TYPING_PREFIX + (room || 'default'), JSON.stringify(out));
    return out;
  } catch { return {}; }
}

export function setTyping(room: string, author: string | undefined, ttlMs = 2500) {
  if (!author) return;
  try {
    const key = TYPING_PREFIX + (room || 'default');
    const data = listTyping(room);
    data[author] = Date.now() + Math.max(500, ttlMs);
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
}

// ── Moodboards ────────────────────────────────────────────────

export function computeMoodboardId(name: string) { return `mood:${slugify(name || 'moodboard')}`; }

export function listMoodboards(): StoredMoodboard[] {
  if (cache.ready) return [...cache.moodboards];
  return readArray<StoredMoodboard>(MB_KEY);
}

export function listMoodboardsByCollection(collectionId: string): StoredMoodboard[] {
  return listMoodboards().filter(m => m.collectionId === collectionId);
}

export function saveMoodboard(mb: StoredMoodboard) {
  const id = mb?.id || computeMoodboardId(mb?.name);
  const now = new Date().toISOString();
  const item: StoredMoodboard = {
    id, name: mb.name || 'Moodboard', notes: mb.notes || '',
    images: mb.images || [], createdAt: mb.createdAt || now,
    updatedAt: now, collectionId: mb.collectionId,
  };
  if (cache.ready) {
    const idx = cache.moodboards.findIndex(x => x.id === id);
    if (idx >= 0) cache.moodboards[idx] = item; else cache.moodboards.unshift(item);
    serverSave('moodboards', item);
  } else {
    const list = listMoodboards();
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) list[idx] = item; else list.unshift(item);
    writeArray(MB_KEY, list);
  }
}

export function removeMoodboard(id: string) {
  if (cache.ready) {
    cache.moodboards = cache.moodboards.filter(m => m.id !== id);
    serverDelete('moodboards', id);
  } else {
    writeArray(MB_KEY, readArray<StoredMoodboard>(MB_KEY).filter(m => m.id !== id));
  }
}

export function renameMoodboard(id: string, name: string) {
  if (cache.ready) {
    const idx = cache.moodboards.findIndex(m => m.id === id);
    if (idx >= 0) {
      cache.moodboards[idx].name = name;
      cache.moodboards[idx].updatedAt = new Date().toISOString();
      serverSave('moodboards', cache.moodboards[idx]);
    }
  } else {
    const list = readArray<StoredMoodboard>(MB_KEY);
    const idx = list.findIndex(m => m.id === id);
    if (idx >= 0) { list[idx].name = name; list[idx].updatedAt = new Date().toISOString(); writeArray(MB_KEY, list); }
  }
}
