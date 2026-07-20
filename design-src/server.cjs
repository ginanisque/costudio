// server.cjs — Fashion AI backend (Express + MySQL + JWT + OpenAI)
'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set; using a temporary secret for this process.');
}

const app = express();

// --- Security & limits ---
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// Accept larger bodies to allow small sketch uploads as data URLs
app.use(express.json({ limit: '12mb' }));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:8080,http://127.0.0.1:8080')
  .split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Origin not allowed by CORS'));
  },
  credentials: false,
}));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use('/api/', limiter);

// --- MySQL connection pool ---
let pool = null;
function getPool() {
  if (!pool && process.env.DB_HOST) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      waitForConnections: true,
      connectionLimit: 10,
      timezone: '+00:00',
    });
  }
  return pool;
}

// --- JWT auth middleware ---
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    req.userId = jwt.verify(token, jwtSecret).userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

// ── Auth routes ──────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const db = getPool();
  if (!db) return res.status(503).json({ error: 'Database not configured.' });
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?,?,?)',
      [name.trim(), email.trim().toLowerCase(), hash]
    );
    const userId = result.insertId;
    await db.execute('INSERT IGNORE INTO user_state (user_id) VALUES (?)', [userId]);
    const token = jwt.sign({ userId }, jwtSecret, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, name: name.trim(), email: email.trim().toLowerCase() } });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already registered.' });
    console.error('/api/auth/register error', e);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const db = getPool();
  if (!db) return res.status(503).json({ error: 'Database not configured.' });
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });
  try {
    const [rows] = await db.execute(
      'SELECT id, name, email, password_hash FROM users WHERE email = ?',
      [email.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid email or password.' });
    await db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    console.error('/api/auth/login error', e);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const db = getPool();
  if (!db) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const [rows] = await db.execute('SELECT id, name, email FROM users WHERE id = ?', [req.userId]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
  } catch (e) {
    console.error('/api/auth/me error', e);
    res.status(500).json({ error: 'Internal error.' });
  }
});

// ── Data CRUD routes ─────────────────────────────────────────

const DATA_TYPES = {
  designers:   'fa_designers',
  collections: 'fa_collections',
  palettes:    'fa_palettes',
  fabrics:     'fa_fabrics',
  pieces:      'fa_pieces',
  notes:       'fa_notes',
  promptsets:  'fa_prompt_sets',
  moodboards:  'fa_moodboards',
};

app.get('/api/data/:type', requireAuth, async (req, res) => {
  const table = DATA_TYPES[req.params.type];
  if (!table) return res.status(400).json({ error: 'Unknown data type.' });
  const db = getPool();
  if (!db) return res.json({ items: [] });
  try {
    const [rows] = await db.execute(
      `SELECT client_id, data_json FROM ${table} WHERE user_id = ? ORDER BY id ASC`,
      [req.userId]
    );
    res.json({ items: rows.map(r => ({ client_id: r.client_id, data: JSON.parse(r.data_json) })) });
  } catch (e) {
    console.error('GET /api/data error', e);
    res.status(500).json({ error: 'Internal error.' });
  }
});

app.post('/api/data/:type', requireAuth, async (req, res) => {
  const table = DATA_TYPES[req.params.type];
  if (!table) return res.status(400).json({ error: 'Unknown data type.' });
  const db = getPool();
  if (!db) return res.status(503).json({ error: 'Database not configured.' });
  const { client_id, data } = req.body || {};
  if (!client_id || !data) return res.status(400).json({ error: 'client_id and data are required.' });
  try {
    const dataJson = JSON.stringify(data);
    if (table === 'fa_pieces') {
      const seq = typeof data.seq === 'number' ? data.seq : 0;
      await db.execute(
        `INSERT INTO fa_pieces (user_id, client_id, seq, data_json) VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE seq=VALUES(seq), data_json=VALUES(data_json)`,
        [req.userId, client_id, seq, dataJson]
      );
    } else {
      await db.execute(
        `INSERT INTO ${table} (user_id, client_id, data_json) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE data_json=VALUES(data_json)`,
        [req.userId, client_id, dataJson]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/data error', e);
    res.status(500).json({ error: 'Internal error.' });
  }
});

app.delete('/api/data/:type/:clientId', requireAuth, async (req, res) => {
  const table = DATA_TYPES[req.params.type];
  if (!table) return res.status(400).json({ error: 'Unknown data type.' });
  const db = getPool();
  if (!db) return res.status(503).json({ error: 'Database not configured.' });
  try {
    await db.execute(
      `DELETE FROM ${table} WHERE user_id=? AND client_id=?`,
      [req.userId, req.params.clientId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/data error', e);
    res.status(500).json({ error: 'Internal error.' });
  }
});

// ── Health / status ──────────────────────────────────────────

app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.get('/api/status', (req, res) => res.json({ ok: true, hasKey: Boolean(process.env.OPENAI_API_KEY) }));

// ── Image generation ─────────────────────────────────────────

const GenSchema = z.object({
  prompt: z.string().min(3),
  size: z.string().regex(/^(256|512|1024)x(256|512|1024)$/).default('1024x1024'),
  n: z.number().int().min(1).max(1).optional(),
});

// Simple in-memory image cache
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 200;
const imgCache = new Map();
function getCache(key) {
  const v = imgCache.get(key);
  if (!v) return null;
  if (Date.now() - v.ts > CACHE_TTL_MS) { imgCache.delete(key); return null; }
  return v;
}
function setCache(key, value) {
  if (imgCache.size >= CACHE_MAX) imgCache.delete(imgCache.keys().next().value);
  imgCache.set(key, value);
}

app.post('/api/generate', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY)
      return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    const parsed = GenSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { prompt, size } = parsed.data;
    const cacheKey = `${size}::${prompt}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ b64: cached.b64, cached: true });
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size, n: 1, response_format: 'b64_json' }),
    });
    const body = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: body?.error || body });
    const b64 = body?.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ error: 'Empty image body' });
    setCache(cacheKey, { ts: Date.now(), b64 });
    res.json({ b64 });
  } catch (err) {
    console.error('/api/generate error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── AI text generation ───────────────────────────────────────

const TextGenSchema = z.object({
  type: z.enum(['designer_profile', 'collection_description', 'inspiration', 'social_pack', 'product_description']),
  payload: z.record(z.any()),
});

app.post('/api/generate-text', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY)
      return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    const parsed = TextGenSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { type, payload } = parsed.data;

    const system =
      'You are a seasoned fashion publicist and media specialist. Write polished, compelling, and brandable copy in a confident, modern tone. Avoid clichés and keep it concise yet evocative.';

    let user;
    if (type === 'designer_profile') {
      user = `Draft a professional designer bio from this data.
Name: ${payload.name || ''}
Experience: ${payload.experience || ''}
Style: ${payload.style || ''}
Education: ${payload.education || ''}
Background: ${payload.background || ''}
Inspirations: ${payload.inspirations || ''}
Specialties: ${payload.specialties || ''}

Output: 1-2 paragraphs.`;
    } else if (type === 'collection_description') {
      user = `Write a captivating collection title and a description for press & buyers.
Collection Name: ${payload.name || 'Untitled'}
Launch Year: ${payload.launchYear || new Date().getFullYear()}
Category: ${payload.category || payload.customCategory || ''}
Target Age: ${payload.targetAge || ''}
Inspiration: ${payload.inspiration || ''}
Pieces: ${payload.pieceCount || payload._pieceCount || ''}
Style elements: ${(payload.styles || payload._styles || []).join(', ')}

Return JSON with fields: {"title": string, "description": string}.
Requirements for description: weave in the style elements and number of pieces where helpful; do not merely repeat the inspiration; keep it concise, press-ready, and evocative.`;
    } else if (type === 'product_description') {
      user = `You are a fashion copywriter. Improve this product listing for a designer fashion collection.
Current title: ${payload.title || ''}
Current description: ${payload.description || ''}
Collection: ${payload.collectionName || ''}
Collection theme: ${payload.collectionInspiration || ''}

Return JSON with fields: {"title": string, "description": string}.
Requirements: title must be concise and compelling (max 10 words); description must be evocative, press-ready, 2-3 sentences; preserve the designer's intent and do not invent details.`;
    } else if (type === 'inspiration') {
      user = `Based on the following inputs, craft a short, evocative inspiration blurb (2-4 sentences) suitable for press notes and collection catalogues. Avoid clichés; write with vivid but concise language.

Inputs (free-form): ${payload.text || ''}`;
    } else {
      user = `Create a concise social media pack for a fashion collection. Provide polished, on-brand copy.
Inputs:
Collection: ${payload.name || 'Untitled'}
Theme: ${payload.inspiration || ''}
Palette keywords: ${(payload.palette || []).join(', ')}

Return JSON with fields:
{
  "tweet": string,
  "instagram": { "caption": string, "hashtags": string[] },
  "press_blurb": string,
  "headline": string
}`;
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.8,
      }),
    });
    const body = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: body?.error || body });
    const content = body?.choices?.[0]?.message?.content || '';

    if (type === 'collection_description' || type === 'social_pack' || type === 'product_description') {
      try {
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        const parsedJson = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
        return res.json(parsedJson);
      } catch (_) {
        if (type === 'collection_description')
          return res.json({ title: payload.name || 'Untitled Collection', description: content });
        if (type === 'product_description')
          return res.json({ title: payload.title || '', description: content });
        return res.json({ tweet: content, instagram: { caption: content, hashtags: [] }, press_blurb: content, headline: '' });
      }
    }
    return res.json({ profile: content.trim() });
  } catch (err) {
    console.error('/api/generate-text error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Prompt suggestions ───────────────────────────────────────

const PromptSuggestSchema = z.object({
  description: z.string().min(5),
  images: z.array(z.string()).optional(),
  count: z.number().int().min(1).max(50).optional(),
});

app.post('/api/suggest-prompts', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY)
      return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    const parsed = PromptSuggestSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { description, images = [], count = 8 } = parsed.data;

    const content = [
      { type: 'text', text: `Create ${count} concise, production-ready prompts for generating fashion images based on this collection description. Each prompt must: specify a single garment/look, silhouette, key materials, color palette, and mood; include photographic cues (fashion editorial photograph, studio lighting, clean backdrop, high detail, realistic fabric drape); exclude watermarks, text, logos, extra limbs. Return a JSON array of strings only.` },
      { type: 'text', text: `Description: ${description}` },
      ...images.slice(0, 4).map(url => ({ type: 'image_url', image_url: { url } })),
    ];

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert prompt engineer for fashion image generation.' },
          { role: 'user', content },
        ],
        temperature: 0.7,
      }),
    });
    const body = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: body?.error || body });
    const text = body?.choices?.[0]?.message?.content || '';
    let prompts = [];
    try {
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      prompts = JSON.parse(text.slice(start, end + 1));
    } catch (_) {
      prompts = text.split(/\n+/).map(s => s.replace(/^[-*\d.\s]+/, '').trim()).filter(Boolean);
    }
    res.json({ prompts });
  } catch (err) {
    console.error('/api/suggest-prompts error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Openverse inspiration images ─────────────────────────────

const InspireSchema = z.object({
  q: z.string().min(2),
  count: z.coerce.number().int().min(1).max(30).optional(),
});

app.get('/api/inspire', async (req, res) => {
  try {
    const parsed = InspireSchema.safeParse({ q: req.query.q, count: req.query.count });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { q, count = 12 } = parsed.data;
    const url = new URL('https://api.openverse.org/v1/images/');
    url.searchParams.set('q', q);
    url.searchParams.set('page_size', String(Math.min(50, count)));
    url.searchParams.set('fields', 'title,url,thumbnail,width,height,license');
    const r = await fetch(url.toString());
    const body = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: body });
    const items = (body?.results || []).map(it => ({
      title: it.title, url: it.url, thumb: it.thumbnail,
      w: it.width, h: it.height, license: it.license,
    }));
    res.json({ items });
  } catch (e) {
    console.error('/api/inspire error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── WebSocket collaboration rooms ────────────────────────────

const { WebSocketServer } = require('ws');

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const server = app.listen(port, host, () => {
  console.log(`Fashion AI server listening on ${host}:${port}`);
  if (getPool()) console.log('MySQL pool connected.');
  else console.log('No DB_HOST set — running without database (localStorage mode).');
});

const wss = new WebSocketServer({ server, path: '/ws' });
const rooms = new Map();

wss.on('connection', (ws, req) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const room = url.searchParams.get('room') || 'default';
    if (!rooms.has(room)) rooms.set(room, new Set());
    const set = rooms.get(room);
    set.add(ws);
    ws.on('message', data => {
      for (const client of set) {
        if (client !== ws && client.readyState === 1) client.send(data);
      }
    });
    ws.on('close', () => {
      set.delete(ws);
      if (set.size === 0) rooms.delete(room);
    });
  } catch (e) {
    console.error('WS error', e);
  }
});
