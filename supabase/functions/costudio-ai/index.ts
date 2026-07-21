type EdgeRuntime = {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

// Access the Supabase Deno runtime without making the repository's regular
// TypeScript checker resolve Deno-only globals or JSR type imports.
const edgeRuntime = (globalThis as typeof globalThis & { Deno: EdgeRuntime }).Deno;

const OPENAI_API_KEY = edgeRuntime.env.get('OPENAI_API_KEY') || '';
const TEXT_MODEL = edgeRuntime.env.get('OPENAI_TEXT_MODEL') || 'gpt-5.6-terra';
const APP_ORIGINS = (edgeRuntime.env.get('APP_ORIGINS') || '*')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') || '';
  const allowAny = APP_ORIGINS.includes('*');
  const allowed = allowAny || !origin || APP_ORIGINS.includes(origin);
  return {
    allowed,
    headers: {
      'Access-Control-Allow-Origin': allowAny ? '*' : origin,
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Vary': 'Origin',
    },
  };
}

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function responseText(body: Record<string, unknown>): string {
  if (typeof body.output_text === 'string') return body.output_text;
  const output = Array.isArray(body.output) ? body.output : [];
  return output.flatMap(item => {
    const content = Array.isArray((item as { content?: unknown[] }).content)
      ? (item as { content: Array<{ type?: string; text?: string }> }).content
      : [];
    return content.filter(part => part.type === 'output_text').map(part => part.text || '');
  }).join('\n').trim();
}

async function openAi(path: string, payload: unknown) {
  if (!OPENAI_API_KEY) return { ok: false, status: 500, body: { error: 'OPENAI_API_KEY is not configured.' } };
  const response = await fetch(`https://api.openai.com/v1/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

async function referenceBlob(source: string) {
  if (source.startsWith('data:')) {
    const match = source.match(/^data:([^;,]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid reference image.');
    const bytes = Uint8Array.from(atob(match[2]), character => character.charCodeAt(0));
    return new Blob([bytes], { type: match[1] || 'image/jpeg' });
  }
  const response = await fetch(source);
  if (!response.ok) throw new Error('A saved reference image could not be downloaded.');
  return await response.blob();
}

async function openAiImageEdit(prompt: string, sources: string[], size: string) {
  if (!OPENAI_API_KEY) return { ok: false, status: 500, body: { error: 'OPENAI_API_KEY is not configured.' } };
  const form = new FormData();
  form.set('model', 'gpt-image-2');
  form.set('prompt', prompt);
  form.set('size', size);
  form.set('quality', 'medium');
  for (let index = 0; index < sources.length; index += 1) {
    const blob = await referenceBlob(sources[index]);
    form.append('image[]', blob, `reference-${index + 1}.${blob.type.includes('png') ? 'png' : 'jpg'}`);
  }
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

function extractJson(text: string): Record<string, unknown> | null {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end < start) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function textPrompt(type: string, payload: Record<string, unknown>) {
  const list = (value: unknown) => Array.isArray(value) ? value.join(', ') : '';
  const instructions = 'You are a fashion business and editorial specialist. Preserve the designer’s intent, avoid clichés and invented facts, and return concise production-ready copy.';

  if (type === 'designer_profile') return {
    instructions,
    input: `Draft a professional designer bio in one or two paragraphs.\n\nDesigner data:\n${JSON.stringify(payload, null, 2)}`,
  };
  if (type === 'collection_description') return {
    instructions,
    input: `Create a press-ready fashion collection title and description. Return only valid JSON with string fields "title" and "description". Do not repeat the inspiration verbatim.\n\nCollection name: ${payload.name || 'Untitled'}\nLaunch year: ${payload.launchYear || ''}\nCategory: ${payload.category || payload.customCategory || ''}\nTarget age: ${payload.targetAge || ''}\nInspiration: ${payload.inspiration || ''}\nPieces: ${payload.pieceCount || payload._pieceCount || ''}\nStyle elements: ${list(payload.styles || payload._styles)}`,
  };
  if (type === 'product_description') return {
    instructions,
    input: `Improve this fashion product listing. Return only valid JSON with string fields "title" and "description". Keep the title under ten words and the description to two or three sentences.\n\nCurrent title: ${payload.title || ''}\nCurrent description: ${payload.description || ''}\nCollection: ${payload.collectionName || ''}\nCollection theme: ${payload.collectionInspiration || ''}`,
  };
  if (type === 'inspiration') return {
    instructions,
    input: `Write a vivid two-to-four-sentence inspiration blurb for press notes and catalogues.\n\nInputs: ${payload.text || ''}`,
  };
  return {
    instructions,
    input: `Create a concise social media pack for this fashion collection. Return only valid JSON with fields "tweet", "instagram" (with "caption" and string array "hashtags"), "press_blurb", and "headline".\n\nCollection: ${payload.name || 'Untitled'}\nTheme: ${payload.inspiration || ''}\nPalette: ${list(payload.palette)}`,
  };
}

async function generateText(request: Request, cors: HeadersInit) {
  const body = await request.json().catch(() => ({})) as { type?: string; payload?: Record<string, unknown> };
  const allowed = ['designer_profile', 'collection_description', 'inspiration', 'social_pack', 'product_description'];
  if (!body.type || !allowed.includes(body.type)) return json({ error: 'Invalid text generation type.' }, 400, cors);
  const prompt = textPrompt(body.type, body.payload || {});
  const result = await openAi('responses', {
    model: TEXT_MODEL,
    instructions: prompt.instructions,
    input: prompt.input,
    reasoning: { effort: 'none' },
    text: { verbosity: 'medium' },
  });
  if (!result.ok) return json({ error: result.body }, result.status, cors);
  const text = responseText(result.body as Record<string, unknown>);
  const structured = extractJson(text);
  if (structured) return json(structured, 200, cors);
  if (body.type === 'collection_description') return json({ title: body.payload?.name || 'Untitled Collection', description: text }, 200, cors);
  if (body.type === 'product_description') return json({ title: body.payload?.title || '', description: text }, 200, cors);
  if (body.type === 'social_pack') return json({ tweet: text, instagram: { caption: text, hashtags: [] }, press_blurb: text, headline: '' }, 200, cors);
  return json({ profile: text }, 200, cors);
}

async function suggestPrompts(request: Request, cors: HeadersInit) {
  const body = await request.json().catch(() => ({})) as {
    description?: string;
    images?: string[];
    fabricImages?: string[];
    styleImages?: string[];
    paletteImages?: string[];
    modelImages?: string[];
    count?: number;
  };
  if (!body.description || body.description.length < 5) return json({ error: 'A collection description is required.' }, 400, cors);
  const count = Math.max(1, Math.min(20, Number(body.count) || 8));
  const content: Array<Record<string, unknown>> = [{
    type: 'input_text',
    text: `Create ${count} production-ready prompts for fashion image generation. Each prompt describes one garment or look, silhouette, materials, palette, mood, lighting, backdrop, and realistic fabric drape. Exclude text, logos, watermarks, and anatomical errors. Return only a JSON array of strings.\n\nCollection: ${body.description}`,
  }];
  const addReferences = (label: string, sources: string[], limit: number) => {
    if (!sources.length) return;
    content.push({ type: 'input_text', text: label });
    for (const imageUrl of sources.slice(0, limit)) content.push({ type: 'input_image', image_url: imageUrl, detail: 'high' });
  };
  addReferences('Fabric swatches and saved materials. Use their visible texture, weight, finish and drape:', body.fabricImages || [], 6);
  const hasTypedReferences = Boolean(body.fabricImages?.length || body.styleImages?.length || body.paletteImages?.length || body.modelImages?.length);
  addReferences('The designer’s sketches, moodboards and previous style concepts. Preserve this design language without copying a single piece verbatim:', [...(body.styleImages || []), ...(hasTypedReferences ? [] : (body.images || []))], 4);
  addReferences('Mandatory collection palette. Every garment must use only or predominantly these exact visible colors:', body.paletteImages || [], 1);
  addReferences('Selected model references. Assign these named people across the collection; preserve their recognizable identity, face, skin tone, hair and body proportions:', body.modelImages || [], 8);
  const result = await openAi('responses', {
    model: TEXT_MODEL,
    instructions: 'You are a fashion art director and precise visual prompt writer.',
    input: [{ role: 'user', content }],
    reasoning: { effort: 'none' },
    text: { verbosity: 'low' },
  });
  if (!result.ok) return json({ error: result.body }, result.status, cors);
  const text = responseText(result.body as Record<string, unknown>);
  let prompts: string[] = [];
  try {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    prompts = JSON.parse(text.slice(start, end + 1));
  } catch {
    prompts = text.split(/\n+/).map(value => value.replace(/^[-*\d.\s]+/, '').trim()).filter(Boolean);
  }
  return json({ prompts: prompts.slice(0, count) }, 200, cors);
}

async function generateImage(request: Request, cors: HeadersInit) {
  const body = await request.json().catch(() => ({})) as {
    prompt?: string;
    size?: string;
    fabricImages?: string[];
    styleImages?: string[];
    paletteImages?: string[];
    modelImages?: string[];
  };
  if (!body.prompt || body.prompt.length < 3) return json({ error: 'A prompt is required.' }, 400, cors);
  const size = body.size === '1024x1024' ? body.size : '1024x1024';
  const fabricImages = (body.fabricImages || []).slice(0, 6);
  const styleImages = (body.styleImages || []).slice(0, 4);
  const paletteImages = (body.paletteImages || []).slice(0, 1);
  const modelImages = (body.modelImages || []).slice(0, 1);
  const sources = [...fabricImages, ...styleImages, ...paletteImages, ...modelImages];
  const referenceGuide = sources.length
    ? `\n\nUse the attached references in this order: ${fabricImages.length} fabric/material image(s), ${styleImages.length} designer sketch/style image(s), ${paletteImages.length} mandatory palette strip(s), and ${modelImages.length} model identity image(s). Create a new original garment image rather than a collage. Preserve material appearance and the designer's visual language. The palette is a color constraint, not general inspiration. When a model image is attached, preserve that same recognizable person's identity, face, skin tone, hair, and body proportions; change only clothing and styling.`
    : '';
  const result = sources.length
    ? await openAiImageEdit(`${body.prompt}${referenceGuide}`, sources, size)
    : await openAi('images/generations', {
        model: 'gpt-image-2',
        prompt: body.prompt,
        size,
        quality: 'medium',
        n: 1,
      });
  if (!result.ok) return json({ error: result.body }, result.status, cors);
  const data = (result.body as { data?: Array<{ b64_json?: string }> }).data || [];
  if (!data[0]?.b64_json) return json({ error: 'The image service returned no image.' }, 502, cors);
  return json({ b64: data[0].b64_json }, 200, cors);
}

async function inspirationImages(url: URL, cors: HeadersInit) {
  const query = (url.searchParams.get('q') || '').trim();
  const count = Math.max(1, Math.min(30, Number(url.searchParams.get('count')) || 12));
  if (query.length < 2) return json({ error: 'A search query is required.' }, 400, cors);
  const openverse = new URL('https://api.openverse.org/v1/images/');
  openverse.searchParams.set('q', query);
  openverse.searchParams.set('page_size', String(count));
  openverse.searchParams.set('fields', 'title,url,thumbnail,width,height,license');
  const response = await fetch(openverse);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return json({ error: body }, response.status, cors);
  const results = Array.isArray(body.results) ? body.results : [];
  return json({ items: results.map((item: Record<string, unknown>) => ({
    title: item.title, url: item.url, thumb: item.thumbnail,
    w: item.width, h: item.height, license: item.license,
  })) }, 200, cors);
}

edgeRuntime.serve(async request => {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors.headers });
  if (!cors.allowed) return json({ error: 'Origin not allowed.' }, 403, cors.headers);

  const url = new URL(request.url);
  const route = url.pathname.split('/costudio-ai').pop() || '/';
  try {
    if (route === '/api/status' || route === '/api/health') return json({ ok: true, hasKey: Boolean(OPENAI_API_KEY), model: TEXT_MODEL, referenceUploads: true, imageModel: 'gpt-image-2' }, 200, cors.headers);
    if (route === '/api/generate-text' && request.method === 'POST') return await generateText(request, cors.headers);
    if (route === '/api/suggest-prompts' && request.method === 'POST') return await suggestPrompts(request, cors.headers);
    if (route === '/api/generate' && request.method === 'POST') return await generateImage(request, cors.headers);
    if (route === '/api/inspire' && request.method === 'GET') return await inspirationImages(url, cors.headers);
    return json({ error: 'Route not found.' }, 404, cors.headers);
  } catch (error) {
    console.error(error);
    return json({ error: 'Internal error.' }, 500, cors.headers);
  }
});
