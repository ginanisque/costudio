import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { listPromptSets, savePromptSet, updateCollection, listCollections } from '@/utils/storage';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { broadcast } from '@/utils/collab';

export default function PromptLibrary({ currentPrompts = [] as string[], onApply }: { currentPrompts?: string[]; onApply: (items: string[]) => void }) {
  const [name, setName] = useState('');
  const [sets, setSets] = useState<StoredPromptSet[]>([]);
  const reload = () => setSets(listPromptSets());
  useEffect(() => { reload(); }, []);
  const [share, setShare] = useLocalStorage<boolean>('share.prompts', false);
  const collections = listCollections();
  const [attachTo, setAttachTo] = useState<string>('');

  const onSave = () => {
    if (!name.trim() || !currentPrompts?.length) return;
    savePromptSet({ id: '', name: name.trim(), items: currentPrompts, createdAt: new Date().toISOString() });
    setName('');
    reload();
    if (share) broadcast('prompts', currentPrompts);
    if (attachTo) updateCollection(attachTo, { promptSetId: `prompts:${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prompt Library</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Input placeholder="Prompt set name" value={name} onChange={(e)=> setName(e.target.value)} />
          <Button onClick={onSave} disabled={!currentPrompts.length}>Save</Button>
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={share} onChange={(e)=> setShare(e.target.checked)} /> Share</label>
          <select className="border rounded px-2 py-1 text-sm" value={attachTo} onChange={(e)=> setAttachTo(e.target.value)}>
            <option value="">Attach to collection…</option>
            {collections.map(c => (<option key={c.id} value={c.id}>{c.title || c.data?.name || c.id}</option>))}
          </select>
        </div>
        <div className="space-y-2">
          {sets.map(ps => (
            <div key={ps.id} className="flex items-center justify-between border rounded p-2">
              <div className="font-medium text-sm">{ps.name}</div>
              <div className="flex gap-2">
                <Button size="sm" onClick={()=> onApply(ps.items)}>Use</Button>
                <Button size="sm" variant="outline" onClick={()=> { const newName = prompt('Rename prompt set', ps.name) || ps.name; if (newName && newName !== ps.name) { savePromptSet({ ...ps, name: newName }); reload(); } }}>Rename</Button>
                <Button size="sm" variant="destructive" onClick={()=> { if (confirm('Delete prompt set?')) { import('@/utils/storage').then(m=> m.removePromptSet(ps.id)); reload(); } }}>Delete</Button>
              </div>
            </div>
          ))}
          {sets.length === 0 && <div className="text-sm text-muted-foreground">No saved prompt sets yet.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
