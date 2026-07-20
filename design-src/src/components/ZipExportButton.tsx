import React, { useState } from 'react';
import type { ImageItem } from '../types';
import { downloadCollectionZip } from '@/utils/zip';

export type ZipExportProps = {
  items: ImageItem[];
  collectionTitle?: string;
  includeIdInFilename?: boolean;
};

export default function ZipExportButton({
  items,
  collectionTitle = 'FashionCollection',
  includeIdInFilename = true,
}: ZipExportProps) {
  const [busy, setBusy] = useState(false);

  async function handleZip() {
    if (!items?.length || busy) return;
    setBusy(true);
    try {
      await downloadCollectionZip(items, collectionTitle, includeIdInFilename);
    } catch (err) {
      console.error('Failed to create ZIP:', err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleZip}
      disabled={busy || !items?.length}
      className={`inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
        busy || !items?.length
          ? 'cursor-not-allowed opacity-60'
          : 'bg-primary text-primary-foreground hover:bg-primary/90'
      }`}
      aria-busy={busy ? 'true' : 'false'}
    >
      {busy ? 'Preparing…' : 'Download ZIP'}
    </button>
  );
}
