import React, { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Palette, Sparkles, Upload, X } from 'lucide-react';
import { generateImageViaProxy, suggestPrompts } from '@/utils/api';
import { toast } from '@/components/ui/use-toast';

type Reference = { id: string; name: string; dataUrl: string };
type GeneratedPiece = { prompt: string; imageUrl: string; title: string };

interface CollectionGeneratorProps {
  initialDescription: string;
  pieceCount: number;
  onPieceCountChange: (count: number) => void;
  palette: string[];
  fabrics: Array<{ name?: string; description?: string; image?: string }>;
  models: Array<{ name?: string; ethnicity?: string; style?: string; image?: string }>;
  size: '256x256' | '512x512' | '1024x1024';
  onGenerated: (pieces: GeneratedPiece[]) => void;
}

const fileId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function createPaletteReference(colors: string[]): string | undefined {
  if (!colors.length) return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  const width = canvas.width / colors.length;
  colors.forEach((color, index) => {
    context.fillStyle = color;
    context.fillRect(Math.floor(index * width), 0, Math.ceil(width), canvas.height);
  });
  return canvas.toDataURL('image/png');
}

async function prepareImage(file: File): Promise<Reference> {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image.`);
  if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name} is larger than 12 MB.`);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error(`Could not prepare ${file.name}.`);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { id: fileId(), name: file.name, dataUrl: canvas.toDataURL('image/jpeg', 0.86) };
}

function ReferenceUploader({
  title,
  description,
  references,
  onChange,
}: {
  title: string;
  description: string;
  references: Reference[];
  onChange: (references: Reference[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    try {
      const room = Math.max(0, 4 - references.length);
      const next = await Promise.all(Array.from(files).slice(0, room).map(prepareImage));
      onChange([...references, ...next]);
    } catch (error) {
      toast({ title: 'Could not add reference', description: error instanceof Error ? error.message : 'Invalid image.', variant: 'destructive' });
    }
  };
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={event => { void addFiles(event.target.files); event.target.value = ''; }} />
        <Button type="button" variant="outline" className="w-full" onClick={() => input.current?.click()} disabled={references.length >= 4}>
          <Upload className="mr-2 h-4 w-4" />Upload images ({references.length}/4)
        </Button>
        {references.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {references.map(reference => (
              <div key={reference.id} className="group relative overflow-hidden rounded-md border bg-white">
                <img src={reference.dataUrl} alt={reference.name} className="h-24 w-full object-cover" />
                <button type="button" className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white" aria-label={`Remove ${reference.name}`} onClick={() => onChange(references.filter(item => item.id !== reference.id))}>
                  <X className="h-3 w-3" />
                </button>
                <div className="truncate px-2 py-1 text-[11px]" title={reference.name}>{reference.name}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CollectionGenerator({ initialDescription, pieceCount, onPieceCountChange, palette, fabrics, models, size, onGenerated }: CollectionGeneratorProps) {
  const [direction, setDirection] = useState(initialDescription);
  const [swatches, setSwatches] = useState<Reference[]>([]);
  const [concepts, setConcepts] = useState<Reference[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  React.useEffect(() => {
    if (initialDescription && !direction.trim()) setDirection(initialDescription);
  }, [initialDescription, direction]);

  const savedSummary = useMemo(() => [
    palette.length ? `${palette.length} palette colors` : '',
    fabrics.length ? `${fabrics.length} saved fabrics` : '',
    models.length ? `${models.length} selected models` : '',
  ].filter(Boolean).join(' · '), [palette.length, fabrics.length, models.length]);

  const generate = async () => {
    if (!direction.trim()) {
      toast({ title: 'Add the collection direction', description: 'Describe the collection before generating.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const count = Math.max(1, Math.min(12, pieceCount));
      const fabricImages = [...swatches.map(item => item.dataUrl), ...fabrics.map(fabric => fabric.image).filter((value): value is string => Boolean(value))].slice(0, 6);
      const styleImages = concepts.map(item => item.dataUrl).slice(0, 4);
      const selectedModels = models.filter(model => Boolean(model.image));
      const modelImages = selectedModels.map(model => model.image).filter((value): value is string => Boolean(value)).slice(0, 8);
      const paletteReference = createPaletteReference(palette);
      const paletteImages = paletteReference ? [paletteReference] : [];
      // Also send the strip through the legacy style channel until every Edge Function is current.
      const styleAndPaletteImages = paletteReference ? [...styleImages, paletteReference] : styleImages;
      const brief = [
        direction.trim(),
        palette.length ? `Required palette: ${palette.join(', ')}.` : '',
        fabrics.length ? `Preferred fabrics: ${fabrics.map(fabric => [fabric.name, fabric.description].filter(Boolean).join(' — ')).join('; ')}.` : '',
        models.length ? `Model direction: ${models.map(model => [model.name, model.ethnicity, model.style].filter(Boolean).join(', ')).join('; ')}.` : '',
        'Create distinct but cohesive full-length fashion looks. Preserve the designer’s style language and show realistic construction and fabric drape.',
      ].filter(Boolean).join('\n');
      setProgress('Developing the collection pieces…');
      const prompts = await suggestPrompts(brief, [], count, { fabricImages, styleImages: styleAndPaletteImages, paletteImages, modelImages });
      if (!prompts.length) throw new Error('The AI did not return any collection pieces.');
      const pieces: GeneratedPiece[] = [];
      for (let index = 0; index < prompts.length; index += 1) {
        setProgress(`Rendering piece ${index + 1} of ${prompts.length}…`);
        const namedModel = selectedModels.find(model => model.name && prompts[index].toLowerCase().includes(model.name.toLowerCase()));
        const assignedModel = namedModel || (selectedModels.length ? selectedModels[index % selectedModels.length] : undefined);
        const identityInstruction = assignedModel
          ? `\nMODEL IDENTITY LOCK: Use the attached model reference as ${assignedModel.name || 'the selected model'}. Preserve the same recognizable person, face, skin tone, hair and body proportions. Change only the garment and styling.`
          : '';
        const paletteInstruction = palette.length
          ? `\nPALETTE LOCK: Garment colors must come from this exact palette: ${palette.join(', ')}. Treat the attached palette strip as mandatory.`
          : '';
        const renderPrompt = `${prompts[index]}${identityInstruction}${paletteInstruction}`;
        const result = await generateImageViaProxy({
          prompt: renderPrompt,
          size,
          fabricImages,
          styleImages: styleAndPaletteImages,
          paletteImages,
          modelImages: assignedModel?.image ? [assignedModel.image] : [],
        });
        pieces.push({ prompt: prompts[index], imageUrl: `data:image/png;base64,${result.b64}`, title: `Look ${index + 1}` });
      }
      onGenerated(pieces);
      toast({ title: 'Collection generated', description: `${pieces.length} pieces are ready in the gallery.` });
    } catch (error) {
      toast({ title: 'Collection generation failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Generate Collection</h2>
        <p className="text-sm text-muted-foreground">Turn your collection direction, selected materials, palette, models, swatches, and sketches into cohesive fashion concepts.</p>
      </div>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <label className="mb-1 block text-sm font-medium">Collection direction</label>
            <Textarea rows={6} value={direction} onChange={event => setDirection(event.target.value)} placeholder="Describe silhouettes, mood, audience, styling and the story connecting the pieces…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-end">
            <div>
              <label className="mb-1 block text-sm font-medium">Number of pieces</label>
              <Input type="number" min={1} max={12} value={pieceCount} onChange={event => onPieceCountChange(Math.max(1, Math.min(12, Number(event.target.value) || 1)))} />
            </div>
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <Palette className="mr-2 inline h-4 w-4" />{savedSummary || 'You can generate now, or select colors, fabrics and models first.'}
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <ReferenceUploader title="Fabric swatches" description="Upload photographs or scans of materials the generated pieces should use." references={swatches} onChange={setSwatches} />
        <ReferenceUploader title="Designer style concepts" description="Upload sketches, moodboards, previous work or silhouette studies to guide the visual language." references={concepts} onChange={setConcepts} />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Button size="lg" onClick={() => void generate()} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {busy ? 'Generating collection…' : `Generate ${pieceCount} piece${pieceCount === 1 ? '' : 's'}`}
        </Button>
        {progress && <p className="text-sm text-muted-foreground">{progress} Complex images can take up to two minutes each.</p>}
      </div>
    </div>
  );
}
