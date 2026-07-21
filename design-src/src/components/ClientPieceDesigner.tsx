import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { generateImageViaProxy } from '@/utils/api';
import { nextPieceSeq, savePiecePersisted } from '@/utils/storage';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Download, Loader2, Upload } from 'lucide-react';

type Client = { id: number; name: string; preferences?: string; measurements?: Record<string, unknown> };
type Model = { name?: string; image?: string; ethnicity?: string; style?: string };
type ClientPiece = { id: string; title?: string; imageUrl?: string; prompt?: string; createdAt?: string };

function paletteStrip(colors: string[]): string | undefined {
  if (!colors.length) return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  const swatchWidth = canvas.width / colors.length;
  colors.forEach((color, index) => { context.fillStyle = color; context.fillRect(index * swatchWidth, 0, swatchWidth + 1, canvas.height); });
  return canvas.toDataURL('image/png');
}

async function prepareReference(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare the reference.');
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.86);
}

export default function ClientPieceDesigner({ palette = [], fabrics = [], models = [] }: {
  palette?: string[];
  fabrics?: Array<{ name?: string; description?: string; image?: string }>;
  models?: Model[];
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const requestedClient = useMemo(() => new URLSearchParams(window.location.search).get('client') || '', []);
  const [clientId, setClientId] = useState(requestedClient);
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [reference, setReference] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [savedDesigns, setSavedDesigns] = useState<ClientPiece[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      if (!supabase) return;
      const { data, error } = await supabase.from('crm_clients').select('id,name,preferences,measurements').order('name');
      if (error) { toast({ title: 'Could not load clients', description: error.message, variant: 'destructive' }); return; }
      setClients((data || []) as Client[]);
      if (!clientId && data?.[0]?.id) setClientId(String(data[0].id));
    })();
  }, []);

  useEffect(() => {
    if (!supabase || !clientId) { setSavedDesigns([]); return; }
    void supabase.from('design_records').select('data').eq('entity_type', 'piece').eq('data->>clientId', clientId).order('created_at', { ascending: false }).then(({ data, error }) => {
      if (error) { console.error('Could not load client designs', error); return; }
      setSavedDesigns((data || []).map(row => row.data as ClientPiece));
    });
  }, [clientId]);

  const selectedClient = clients.find(client => String(client.id) === clientId);

  const generate = async () => {
    if (!selectedClient || !brief.trim()) {
      toast({ title: 'Choose a client and describe the piece', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const paletteImage = paletteStrip(palette);
      const model = models.find(item => item.image);
      const fabricImages = fabrics.map(item => item.image).filter((value): value is string => Boolean(value)).slice(0, 4);
      const styleImages = [reference, paletteImage].filter((value): value is string => Boolean(value));
      const prompt = [
        `Create one original, full-length, production-realistic bespoke fashion design for client ${selectedClient.name}.`,
        title.trim() ? `Piece name: ${title.trim()}.` : '',
        `Design brief: ${brief.trim()}`,
        selectedClient.preferences ? `Client preferences: ${selectedClient.preferences}` : '',
        palette.length ? `PALETTE LOCK: Use these exact garment colors: ${palette.join(', ')}. The attached color strip is mandatory.` : '',
        fabrics.length ? `Materials: ${fabrics.map(item => [item.name, item.description].filter(Boolean).join(' — ')).join('; ')}.` : '',
        model?.image ? `MODEL IDENTITY LOCK: Preserve the attached selected model's recognizable face, skin tone, hair and body proportions; change only the garment and styling.` : '',
        reference ? 'Use the attached client sketch or style reference as design guidance without adding text or a collage.' : '',
      ].filter(Boolean).join('\n');
      const result = await generateImageViaProxy({
        prompt,
        size: '1024x1024',
        fabricImages,
        styleImages,
        paletteImages: paletteImage ? [paletteImage] : [],
        modelImages: model?.image ? [model.image] : [],
      });
      const generated = `data:image/png;base64,${result.b64}`;
      const id = crypto.randomUUID();
      const savedPiece = {
        id,
        seq: nextPieceSeq(),
        prompt,
        title: title.trim() || 'Custom client piece',
        imageUrl: generated,
        clientId: String(selectedClient.id),
        clientName: selectedClient.name,
        kind: 'client',
        createdAt: new Date().toISOString(),
      } as const;
      await savePiecePersisted(savedPiece);
      setSavedDesigns(previous => [savedPiece, ...previous]);
      setImageUrl(generated);
      toast({ title: 'Client design saved', description: `Attached to ${selectedClient.name}'s profile.` });
    } catch (error) {
      toast({ title: 'Could not generate the client piece', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <div><h2 className="text-xl font-semibold">Design for a Client</h2><p className="text-sm text-muted-foreground">Create a single bespoke piece and keep the concept attached to the client’s CRM profile.</p></div>
    <Card><CardHeader><CardTitle>Client brief</CardTitle></CardHeader><CardContent className="space-y-4">
      <div><label className="mb-1 block text-sm font-medium">Client</label><select className="h-10 w-full rounded-md border bg-background px-3" value={clientId} onChange={event => setClientId(event.target.value)}><option value="">Select client…</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div>
      {selectedClient?.preferences && <div className="rounded-md bg-muted p-3 text-sm"><strong>Saved preferences:</strong> {selectedClient.preferences}</div>}
      <div><label className="mb-1 block text-sm font-medium">Piece name</label><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Tola’s architectural dinner jacket" /></div>
      <div><label className="mb-1 block text-sm font-medium">Design brief</label><Textarea rows={6} value={brief} onChange={event => setBrief(event.target.value)} placeholder="Describe the occasion, silhouette, fit, fabric, details and mood…" /></div>
      <input ref={input} className="hidden" type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) void prepareReference(file).then(setReference).catch(error => toast({ title: error.message, variant: 'destructive' })); }} />
      <Button type="button" variant="outline" onClick={() => input.current?.click()}><Upload className="mr-2 h-4 w-4" />{reference ? 'Replace sketch/reference' : 'Upload sketch/reference'}</Button>
      {reference && <img src={reference} alt="Design reference" className="h-40 rounded-md border object-contain" />}
      <Button type="button" onClick={() => void generate()} disabled={busy}>{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating and saving…</> : 'Generate Client Piece'}</Button>
    </CardContent></Card>
    {savedDesigns.length > 0 && <Card><CardHeader><CardTitle>Attached designs for {selectedClient?.name}</CardTitle></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{savedDesigns.map(design => <div key={design.id} className="overflow-hidden rounded-lg border bg-card">{design.imageUrl && <img src={design.imageUrl} alt={design.title || 'Client design'} className="aspect-square w-full object-cover" />}<div className="p-3 text-sm font-medium">{design.title || 'Custom client piece'}</div></div>)}</div></CardContent></Card>}
    {imageUrl && <Card><CardHeader><CardTitle>{title || 'Custom client piece'} · {selectedClient?.name}</CardTitle></CardHeader><CardContent className="space-y-3"><img src={imageUrl} alt={title || 'Generated client design'} className="w-full max-w-xl rounded-lg border" /><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { const link = document.createElement('a'); link.href = imageUrl; link.download = `${(title || 'client-piece').replace(/[^a-z0-9]+/gi, '-')}.png`; link.click(); }}><Download className="mr-2 h-4 w-4" />Download PNG</Button><Button variant="outline" onClick={() => { window.location.href = `/costing/?workspace=crm&view=clients&client=${clientId}`; }}>Open Client Profile</Button></div></CardContent></Card>}
  </div>;
}
