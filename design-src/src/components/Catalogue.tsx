import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listPieces, listCollections, listInbox, clearInbox } from '@/utils/storage';
import { broadcast } from '@/utils/collab';
import { toast } from '@/components/ui/use-toast';

export default function Catalogue() {
  const [q, setQ] = useState('');
  const [collection, setCollection] = useState<string>('');
  const [pieces, setPieces] = useState(() => Array.isArray(listPieces()) ? listPieces() : []);
  const [inbox, setInbox] = useState(() => listInbox());
  useEffect(() => { try { setPieces(listPieces()); setInbox(listInbox()); } catch { /* ignore */ } }, []);
  const collections = useMemo(() => listCollections(), []);
  const filtered = useMemo(() => {
    const arr = Array.isArray(pieces) ? pieces : [];
    return arr.filter(p => {
      const text = `${p.id} ${p.prompt} ${p.collectionId}`.toLowerCase();
      const okQ = q ? text.includes(q.toLowerCase()) : true;
      const okC = collection ? p.collectionId === collection : true;
      return okQ && okC;
    });
  }, [pieces, q, collection]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const display = useMemo(() => filtered.filter(p => !showSelectedOnly || sel[p.id]), [filtered, sel, showSelectedOnly]);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const applyImport = () => {
    const ids = importText.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
    const set: Record<string, boolean> = {};
    for (const id of ids) set[id] = true;
    setSel(set);
  };
  const repairStorage = () => {
    try {
      const PIECE_KEY = 'fashionAI.pieces';
      const SEQ_KEY = 'fashionAI.pieceSeq';
      const raw = localStorage.getItem(PIECE_KEY);
      let parsed: unknown = [];
      try { parsed = raw ? JSON.parse(raw) : []; } catch { /* ignore */ }
      const arr = Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
      const seen = new Set<string>();
      const fixed = arr.filter((p) => p && typeof p.id === 'string' && (typeof p.seq === 'number' || typeof p.seq === 'string') && typeof p.prompt === 'string')
        .map((p) => ({
          id: String(p.id),
          seq: typeof p.seq === 'number' ? p.seq : Number(p.seq) || 0,
          collectionId: p.collectionId ? String(p.collectionId) : undefined,
          prompt: String(p.prompt || ''),
          size: p.size ? String(p.size) : undefined,
          imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl : undefined,
          createdAt: p.createdAt ? String(p.createdAt) : new Date().toISOString(),
          updatedAt: p.updatedAt ? String(p.updatedAt) : undefined,
        }))
        .filter((p) => {
          if (!p.id) return false;
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
      localStorage.setItem(PIECE_KEY, JSON.stringify(fixed));
      // Repair seq
      const maxSeq = fixed.reduce((m, p) => Math.max(m, Number(p.seq) || 0), 0);
      const curSeq = Number(localStorage.getItem(SEQ_KEY) || '0') || 0;
      if (maxSeq > curSeq) localStorage.setItem(SEQ_KEY, String(maxSeq));
      setPieces(fixed);
      toast({ title: 'Storage repaired', description: `${arr.length - fixed.length} invalid removed · seq=${Math.max(maxSeq, curSeq)}` });
    } catch (e) {
      toast({ title: 'Repair failed', description: String(e instanceof Error ? e.message : e ?? 'Unknown error') });
    }
  };
  useEffect(() => {
    try {
      const raw = localStorage.getItem('catalogue.import') || '';
      if (raw.trim()) {
        setImportText(raw);
        setShowImport(true);
        const ids = raw.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
        const set: Record<string, boolean> = {};
        for (const id of ids) set[id] = true;
        setSel(set);
        localStorage.removeItem('catalogue.import');
      }
    } catch { /* ignore */ }
  }, []);

  const exportCsv = () => {
    const header = ['seq','id','collectionId','size','createdAt','prompt'];
    const rows = filtered.map(p => [p.seq, p.id, p.collectionId || '', p.size || '', p.createdAt, p.prompt]);
    const csv = [header, ...rows].map(r => r.map(v => {
      const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'catalogue.csv';
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catalogue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search prompt / id" value={q} onChange={(e)=> setQ(e.target.value)} />
          <select className="border rounded px-2 py-1 text-sm" value={collection} onChange={(e)=> setCollection(e.target.value)}>
            <option value="">All collections</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.title || c.data?.name || c.id}</option>
            ))}
          </select>
          <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
          <Button variant="outline" onClick={()=> setShowImport(v => !v)}>{showImport ? 'Hide Import' : 'Import IDs…'}</Button>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <input id="selOnly" type="checkbox" checked={showSelectedOnly} onChange={(e)=> setShowSelectedOnly(e.target.checked)} />
              <label htmlFor="selOnly">Show only selected</label>
            </div>
            <Button variant="outline" onClick={()=> {
              const all = Object.fromEntries(filtered.map(p => [p.id, true])); setSel(all);
            }}>Select All</Button>
            <Button variant="outline" onClick={()=> setSel({})}>Clear</Button>
            <Button onClick={()=> {
              const ids = filtered.filter(p => sel[p.id]).map(p=> p.id);
              if (!ids.length) return;
              navigator.clipboard.writeText(ids.join('\n'));
            }}>Copy IDs</Button>
            <Button onClick={()=> {
              const selected = filtered.filter(p => sel[p.id]).map(p => ({ id: p.id, prompt: p.prompt, collectionId: p.collectionId }));
              if (!selected.length) return;
              broadcast('catalogue', { items: selected });
            }}>Share Selected</Button>
            <Button variant="outline" onClick={repairStorage}>Repair Storage</Button>
          </div>
        </div>
        {showImport && (
          <div className="p-3 border rounded bg-muted/30 space-y-2">
            <div className="text-xs text-muted-foreground">Paste IDs (newline, comma, or space separated). Matching pieces will be selected.</div>
            <textarea className="w-full border rounded p-2 text-sm" rows={4} value={importText} onChange={(e)=> setImportText(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={applyImport}>Apply Selection</Button>
              <Button size="sm" variant="outline" onClick={()=> { setImportText(''); setSel({}); }}>Reset</Button>
            </div>
          </div>
        )}
        {inbox.length > 0 && (
          <div className="p-3 bg-amber-50 border rounded">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">Inbox · {inbox.length} item(s)</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={()=> { const ids = inbox.map(i=> i.id); navigator.clipboard.writeText(ids.join('\n')); }}>Copy IDs</Button>
                <Button variant="outline" size="sm" onClick={()=> { try { clearInbox(); setInbox([]); } catch { /* ignore */ } }}>Clear Inbox</Button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {inbox.map(i => (
                <div key={i.id} className="border rounded p-2 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div>{i.id}</div>
                    <button className="underline" onClick={()=> navigator.clipboard.writeText(i.id)}>Copy</button>
                  </div>
                  <div className="mt-1 line-clamp-3" title={i.prompt}>{i.prompt}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {display.map(p => (
            <div key={p.id} className={`border rounded p-2 ${sel[p.id] ? 'ring-2 ring-primary' : ''}`}>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>#{p.seq} · {p.id}</div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={!!sel[p.id]} onChange={(e)=> setSel(prev => ({ ...prev, [p.id]: e.target.checked }))} />
                  <button className="underline" title="Copy ID" onClick={()=> navigator.clipboard.writeText(p.id)}>Copy</button>
                </div>
              </div>
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.prompt} className="mt-1 w-full h-44 object-cover rounded" />
              ) : (
                <div className="mt-1 w-full h-44 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">Pending image</div>
              )}
              <div className="mt-2 text-sm line-clamp-3" title={p.prompt}>{p.prompt}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground">No pieces found.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
