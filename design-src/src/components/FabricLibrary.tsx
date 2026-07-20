import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { listFabrics, saveFabric, type StoredFabric, listCollections, updateCollection } from '@/utils/storage';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { broadcast } from '@/utils/collab';

export default function FabricLibrary() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [flow, setFlow] = useState<'firm'|'soft'|'flowing'|'stiff'|'none'>('none');
  const [image, setImage] = useState<string>('');
  const [items, setItems] = useState<StoredFabric[]>([]);
  const [share, setShare] = useLocalStorage<boolean>('share.fabric', false);
  const collections = listCollections();
  const [attachTo, setAttachTo] = useState<string>('');

  const reload = () => setItems(listFabrics());
  useEffect(() => { reload(); }, []);

  const onFile = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setImage((r.result as string) || '');
    r.readAsDataURL(f);
  };

  const onSave = () => {
    if (!name.trim()) return;
    saveFabric({ id:'', name: name.trim(), description, content, flow: flow==='none'? undefined : flow, image, createdAt: new Date().toISOString() });
    setName(''); setDescription(''); setContent(''); setFlow('none'); setImage('');
    reload();
    if (share) broadcast('fabric', { name, description, content, flow, image });
    if (attachTo) {
      const coll = listCollections().find(c=> c.id === attachTo);
      const ids = (coll?.fabricIds || []);
      const fid = `fabric:${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}`;
      updateCollection(attachTo, { fabricIds: Array.from(new Set([...ids, fid])) });
      broadcast('attach', { type: 'fabric', collectionId: attachTo, fabricId: fid });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fabric Library</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm">Fabric Name</label>
            <Input value={name} onChange={(e)=> setName(e.target.value)} placeholder="e.g., Silk Charmeuse" />
            <label className="text-sm">Description</label>
            <Textarea rows={3} value={description} onChange={(e)=> setDescription(e.target.value)} placeholder="Weight, weave, usage…" />
            <label className="text-sm">Content</label>
            <Input value={content} onChange={(e)=> setContent(e.target.value)} placeholder="e.g., 100% Silk" />
            <label className="text-sm">Flow / Hand</label>
            <Select value={flow} onValueChange={(v)=> setFlow(v as 'firm' | 'soft' | 'flowing' | 'stiff' | '')}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="firm">Firm</SelectItem>
                <SelectItem value="soft">Soft</SelectItem>
                <SelectItem value="flowing">Flowing</SelectItem>
                <SelectItem value="stiff">Stiff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm">Upload Swatch</label>
            <input type="file" accept="image/*" onChange={(e)=> onFile(e.target.files?.[0])} />
            {image && (<img src={image} alt="swatch" className="w-full h-40 object-cover rounded border" />)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end items-center">
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={share} onChange={(e)=> setShare(e.target.checked)} /> Share</label>
          <select className="border rounded px-2 py-1 text-sm" value={attachTo} onChange={(e)=> setAttachTo(e.target.value)}>
            <option value="">Attach to collection…</option>
            {collections.map(c => (<option key={c.id} value={c.id}>{c.title || c.data?.name || c.id}</option>))}
          </select>
          <Button onClick={onSave} disabled={!name.trim()}>Save Fabric</Button>
        </div>

        <div className="space-y-2">
          {items.map(it => (
            <div key={it.id} className="flex items-center gap-3 border rounded p-2">
              {it.image ? <img src={it.image} alt={it.name} className="w-16 h-16 object-cover rounded" /> : <div className="w-16 h-16 rounded bg-gray-100" />}
              <div className="flex-1">
                <div className="font-medium">{it.name}</div>
                <div className="text-sm text-muted-foreground">{[it.content, it.flow].filter(Boolean).join(' · ')}</div>
                {it.description && <div className="text-sm">{it.description}</div>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={()=> { broadcast('fabric', it); }}>Share</Button>
                <Button size="sm" variant="outline" onClick={()=> { const n = prompt('Rename fabric', it.name) || it.name; if (n && n !== it.name) { saveFabric({ ...it, name: n }); reload(); } }}>Rename</Button>
                <Button size="sm" variant="destructive" onClick={()=> { if (confirm('Delete fabric?')) { import('@/utils/storage').then(m=> m.removeFabric(it.id)); reload(); } }}>Delete</Button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-muted-foreground">No fabrics yet.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
