import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from './ui/use-toast';
import { listPalettes, savePalette, type StoredPalette, removePalette } from '@/utils/storage';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { listCollections, updateCollection } from '@/utils/storage';
import { broadcast } from '@/utils/collab';

export default function PaletteLibrary({ currentColors = [] as string[] }) {
  const [name, setName] = useState('');
  const [palettes, setPalettes] = useState<StoredPalette[]>([]);
  const [share, setShare] = useLocalStorage<boolean>('share.palette', false);
  const [attachTo, setAttachTo] = useState<string>('');
  const collections = listCollections();

  const reload = () => setPalettes(listPalettes());
  useEffect(() => { reload(); }, []);

  const onSave = () => {
    if (!name.trim()) { toast({ title: 'Name required' }); return; }
    savePalette({ id: '', name: name.trim(), colors: currentColors, createdAt: new Date().toISOString() });
    toast({ title: 'Palette saved' });
    setName('');
    reload();
    if (share) broadcast('palette', { name, colors: currentColors });
    if (attachTo) {
      const pid = `palette:${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}`;
      updateCollection(attachTo, { paletteId: pid });
      broadcast('attach', { type: 'palette', collectionId: attachTo, paletteId: pid });
      toast({ title: 'Attached to collection' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Palettes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Input placeholder="Palette name" value={name} onChange={(e)=> setName(e.target.value)} />
          <Button onClick={onSave} disabled={!currentColors.length}>Save</Button>
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={share} onChange={(e)=> setShare(e.target.checked)} /> Share</label>
          <select className="border rounded px-2 py-1 text-sm" value={attachTo} onChange={(e)=> setAttachTo(e.target.value)}>
            <option value="">Attach to collection…</option>
            {collections.map(c => (<option key={c.id} value={c.id}>{c.title || c.data?.name || c.id}</option>))}
          </select>
        </div>
        <div className="space-y-2">
          {palettes.map(p => (
            <div key={p.id} className="flex items-center justify-between border rounded p-2">
              <div className="flex items-center gap-2">
                <div className="font-medium text-sm">{p.name}</div>
                <div className="flex gap-1">
                  {p.colors.slice(0,8).map((c,i)=>(<div key={i} className="w-4 h-4 rounded border" style={{backgroundColor:c}} />))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={()=> { broadcast('palette', { name: p.name, colors: p.colors }); }}>Share</Button>
                <Button size="sm" variant="outline" onClick={()=> navigator.clipboard.writeText(p.colors.join(','))}>Copy CSV</Button>
                <Button size="sm" variant="outline" onClick={()=> { const newName = prompt('Rename palette', p.name) || p.name; if (newName && newName !== p.name) { savePalette({ ...p, id: p.id, name: newName }); reload(); } }}>Rename</Button>
                <Button size="sm" variant="destructive" onClick={()=> { if (confirm('Delete palette?')) { removePalette(p.id); reload(); } }}>Delete</Button>
              </div>
            </div>
          ))}
          {palettes.length === 0 && <div className="text-sm text-muted-foreground">No saved palettes yet.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
