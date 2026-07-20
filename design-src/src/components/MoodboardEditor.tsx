import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { listMoodboards, saveMoodboard, type StoredMoodboard, computeMoodboardId } from '@/utils/storage';

export function MoodboardEditor({
  collectionId,
  initialNotes = '',
  initialImages = [],
  onChange,
  onSaved,
}: {
  collectionId?: string;
  initialNotes?: string;
  initialImages?: string[];
  onChange?: (notes: string, images: string[]) => void;
  onSaved?: (mb: StoredMoodboard) => void;
}) {
  const [notes, setNotes] = React.useState(initialNotes);
  const [images, setImages] = React.useState<string[]>(initialImages.slice(0, 12));
  const [name, setName] = React.useState('Moodboard');
  const [existing, setExisting] = React.useState<StoredMoodboard[]>([]);

  React.useEffect(() => { try { setExisting(listMoodboards()); } catch { /* ignore */ } }, []);
  React.useEffect(() => { onChange?.(notes, images); }, [notes, images]);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 12 - images.length);
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
    setImages((prev) => [...prev, ...dataUrls].slice(0, 12));
  };

  const save = () => {
    const id = computeMoodboardId(name);
    const item: StoredMoodboard = { id, name, notes, images, createdAt: new Date().toISOString(), collectionId };
    saveMoodboard(item);
    setExisting(listMoodboards());
    toast({ title: 'Moodboard saved', description: name });
    onSaved?.(item);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Moodboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <Label className="text-sm">Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e)=> setNotes(e.target.value)} placeholder="Themes, references, keywords..." />
          </div>
          <div>
            <Label className="text-sm">Name</Label>
            <Input value={name} onChange={(e)=> setName(e.target.value)} placeholder="Moodboard name" />
          </div>
        </div>
        <div>
          <Label className="text-sm mb-1 block">Images (up to 12)</Label>
          <div className="flex items-center gap-2">
            <input type="file" multiple accept="image/*" onChange={(e)=> handleFiles(e.target.files)} />
            {images.length > 0 && (
              <Button variant="outline" size="sm" onClick={()=> setImages([])}>Clear</Button>
            )}
          </div>
          {images.length > 0 && (
            <div className="mt-2 grid grid-cols-6 gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} alt={`mood-${i}`} className="w-full h-20 object-cover rounded border" />
                  <button className="absolute top-1 right-1 text-[10px] px-1 py-0.5 bg-white/90 border rounded opacity-0 group-hover:opacity-100" onClick={()=> setImages(prev => prev.filter((_, idx)=> idx!==i))}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Tip: Notes are added to collection description. Images seed prompt suggestions.</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={save}>Save Moodboard</Button>
          </div>
        </div>
        <div>
          <Label className="text-sm mb-1 block">Saved Moodboards</Label>
          {existing.length === 0 && (
            <div className="text-xs text-muted-foreground">None yet</div>
          )}
          <div className="flex flex-wrap gap-2">
            {existing.slice(0, 10).map((m) => (
              <button key={m.id} className="text-xs border rounded px-2 py-1 hover:bg-muted" title={m.notes}
                onClick={()=> { setName(m.name); setNotes(m.notes||''); setImages(m.images||[]); toast({ title: 'Moodboard loaded', description: m.name }); }}>
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MoodboardEditor;

