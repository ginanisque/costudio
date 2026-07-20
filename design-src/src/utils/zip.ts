import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { ImageItem } from '@/types';
import { listPieces } from '@/utils/storage';
import { toCSV } from '@/utils/csv';

export function b64ToBlob(b64: string, contentType = 'image/png'): Blob {
  const byteChars = atob(b64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
}

export async function fetchBlob(url: string): Promise<Blob> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch ${url}`);
  return r.blob();
}

export function safeName(s: string): string {
  return s.replace(/[^a-z0-9\-_.]+/gi, '_').slice(0, 80);
}

export async function downloadCollectionZip(
  items: ImageItem[],
  collectionTitle = 'FashionCollection',
  includeIdInFilename = true,
): Promise<void> {
  if (!items.length) return;

  const zip = new JSZip();
  const date = new Date();
  const stamp =
    `${date.getFullYear()}` +
    `${String(date.getMonth() + 1).padStart(2, '0')}` +
    `${String(date.getDate()).padStart(2, '0')}` +
    `-${String(date.getHours()).padStart(2, '0')}` +
    `${String(date.getMinutes()).padStart(2, '0')}`;
  const baseName = safeName(collectionTitle || 'FashionCollection');

  const seqMap = Object.fromEntries(listPieces().map(p => [p.id, p.seq as number]));
  const manifest: Record<string, unknown>[] = [];

  for (const [idx, item] of items.entries()) {
    let fileBase = item.fileName;
    if (!fileBase) {
      const cat = safeName(item.category || 'look');
      if (includeIdInFilename && item.id) {
        fileBase = `${cat}_${item.id}`;
      } else {
        const seq = item.id ? (seqMap[item.id] || null) : null;
        fileBase = seq ? `${cat}_${seq}` : `${cat}_${String(idx + 1).padStart(3, '0')}`;
      }
    }
    const fileName = `${fileBase}.png`;

    let blob: Blob | null = null;
    if (item.b64) blob = b64ToBlob(item.b64);
    else if (item.url) blob = await fetchBlob(item.url);
    else continue;

    zip.file(fileName, blob);
    manifest.push({
      id: item.id,
      seq: item.id ? (seqMap[item.id] || undefined) : undefined,
      fileName,
      prompt: item.prompt,
      category: item.category,
      size: item.size,
    });
  }

  zip.file('manifest.csv', toCSV(manifest));
  zip.file(
    'manifest.json',
    JSON.stringify({ collection: baseName, generatedAt: new Date().toISOString(), items: manifest }, null, 2),
  );

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  saveAs(blob, `${baseName}_${stamp}.zip`);
}
