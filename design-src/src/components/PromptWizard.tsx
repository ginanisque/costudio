import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { suggestPrompts, fetchInspirationImages } from '@/utils/api';
import PromptEditor from './PromptEditor';
import { toast } from '@/components/ui/use-toast';

export interface PromptWizardProps {
  onPromptsReady?: (prompts: string[]) => void; // optional immediate generation
  onPromptsDraft?: (prompts: string[]) => void; // populate prompts area
  count?: number; // desired number of prompts
  initialDescription?: string; // optional prefilled description from collection + trends
  initialImages?: string[]; // optional prefilled reference images
}

export default function PromptWizard({ onPromptsReady, onPromptsDraft, count = 8, initialDescription, initialImages }: PromptWizardProps) {
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [draftPrompts, setDraftPrompts] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [inspo, setInspo] = useState<{ title: string; url: string; thumb: string }[]>([]);

  // Prefill the description with richer collection context when provided
  React.useEffect(() => {
    if (initialDescription && !description.trim()) {
      setDescription(initialDescription);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDescription]);

  // Prefill reference images when provided
  React.useEffect(() => {
    if (initialImages && initialImages.length && images.length === 0) {
      setImages(initialImages.slice(0, 4));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialImages?.join(',')]);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 4);
    const dataUrls = await Promise.all(
      arr.map(
        (f) =>
          new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve((r.result as string) || '');
            r.readAsDataURL(f);
          })
      )
    );
    setImages((prev) => [...prev, ...dataUrls].slice(0, 4));
  };

  const requestPrompts = async () => {
    if (!description.trim()) {
      toast({ title: 'Add a description', description: 'Please describe your collection so I can suggest prompts.' });
      return;
    }
    setBusy(true);
    try {
      const prompts = await suggestPrompts(description, images, Math.max(1, Math.min(50, count)));
      if (onPromptsDraft) {
        onPromptsDraft(prompts);
      } else if (onPromptsReady) {
        onPromptsReady(prompts);
      } else {
        setDraftPrompts(prompts); // fallback to local editor in future
      }
    } catch (e) {
      console.error('Failed to suggest prompts', e);
      const raw = typeof e?.message === 'string' ? e.message : '';
      let friendly = raw || 'Unknown error';
      if (/OPENAI_API_KEY/i.test(raw)) friendly = 'Server is missing OPENAI_API_KEY. Set it in .env and restart the server.';
      else if (/401|unauthorized/i.test(raw)) friendly = 'Unauthorized: Verify the OpenAI API key on the server.';
      else if (/429|rate limit|quota/i.test(raw)) friendly = 'Rate limited: Quota or rate limit exceeded. Try again later.';
      else if (/ENOTFOUND|ECONNREFUSED|fetch failed|network/i.test(raw)) friendly = 'Network error: Could not reach the AI service. Ensure the API server is running and online.';
      toast({ title: 'AI prompt generation failed', description: friendly, variant: 'destructive' });
      // Fallback: generate prompts on the client so user can continue
      const keywords = description
        .toLowerCase()
        .replace(/[^a-z0-9\s,/-]+/g, ' ')
        .split(/[,\s]+/)
        .filter(Boolean);
      const themes = Array.from(new Set(keywords)).slice(0, 8);
      const defaults = [
        'editorial lighting',
        'studio backdrop',
        'runway-ready',
        'natural drape',
        'textural emphasis',
        'balanced composition',
      ];
      const fallback = Array.from({ length: Math.max(1, Math.min(50, count)) }).map((_, i) => {
        const mood = themes[i % Math.max(1, themes.length)] || 'modern';
        const extra = defaults[i % defaults.length];
        return `fashion look, ${mood} aesthetic, full-length garment on mannequin, premium fabrics, ${extra}, high detail, 4k`;
      });
      toast({ title: 'Using fallback prompts', description: 'Generated prompts locally so you can continue.' });
      if (onPromptsDraft) onPromptsDraft(fallback);
    } finally {
      setBusy(false);
    }
  };

  const handleSearchInspo = async () => {
    if (!description.trim()) {
      toast({ title: 'Add a description', description: 'Enter a brief description first.' });
      return;
    }
    try {
      const items = await fetchInspirationImages(description, 12);
      setInspo(items.map(i => ({ title: i.title, url: i.url, thumb: i.thumb })));
    } catch (e) {
      toast({ title: 'Inspiration search failed', description: e?.message || 'Network error', variant: 'destructive' });
    }
  };

  // If you want a pre-generation edit step, setDraftPrompts([...]) and return a PromptEditor here.

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Generate Prompts from Description & Sketches</CardTitle>
        <p className="text-sm text-muted-foreground">Describe your collection and optionally add sketches or reference images. You can edit prompts later.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Collection Description</label>
          <Textarea rows={4} value={description} onChange={(e)=> setDescription(e.target.value)} placeholder="Describe the collection vision, silhouettes, fabrics, palette, mood..." />
        </div>
        <div>
          <label className="block text-sm mb-1">Reference Images or Sketches</label>
          <div className="flex items-center gap-2">
            <input type="file" accept="image/*" multiple onChange={(e)=> handleFiles(e.target.files)} />
            <Button type="button" variant="outline" onClick={handleSearchInspo}>Search Inspiration</Button>
          </div>
          {inspo.length > 0 && (
            <div className="mt-2 grid grid-cols-6 gap-2">
              {inspo.map((it, i) => (
                <button key={i} className="border rounded overflow-hidden hover:opacity-90" title={it.title}
                  onClick={() => { setImages(prev => [...prev, it.url]); }}
                >
                  <img src={it.thumb || it.url} alt={it.title} className="w-full h-20 object-cover" />
                </button>
              ))}
            </div>
          )}
          {images.length > 0 && (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {images.map((src, i) => (
                <img key={i} src={src} alt={`ref-${i}`} className="w-full h-24 object-cover rounded" />
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={requestPrompts} disabled={busy}>{busy ? 'Thinking…' : 'Generate Prompts'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
