import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listCollections, listDesigners, listMessages, listPeerSeen, listTyping, getLastOpenTs, type StoredCollection, type StoredDesigner } from '@/utils/storage';
import { getCurrentCollab } from '@/utils/collab';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

type DesignerProfile = {
  name: string;
  role?: string;
  background: string;
  experience: string;
  style: string;
  inspirations: string;
  education: string;
  specialties: string;
  address?: string;
  website?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  logo?: string;
};

type CollectionData = {
  name: string;
  launchYear: string;
  inspiration: string;
  targetAge: string;
  category: string;
  customCategory: string;
};

export interface SessionSidebarProps {
  designer?: DesignerProfile | null;
  collection?: CollectionData | null;
  generatedTitle?: string;
  generatedDescription?: string;
  imagesCount?: number;
  polishedBio?: string;
  onSaveDesigner?: () => void;
  onSaveCollection?: () => void;
  onLoadDesigner?: (profile: DesignerProfile) => void;
  onLoadCollection?: (data: CollectionData, title?: string, description?: string) => void;
  onNavigate?: (tab: string) => void;
  onOpenMessages?: () => void;
}

export default function SessionSidebar({
  designer,
  collection,
  generatedTitle,
  generatedDescription,
  imagesCount = 0,
  polishedBio,
  onSaveDesigner,
  onSaveCollection,
  onLoadDesigner,
  onLoadCollection,
  onNavigate,
  onOpenMessages,
}: SessionSidebarProps) {
  const [designers, setDesigners] = useState<StoredDesigner[]>([]);
  const [collections, setCollections] = useState<StoredCollection[]>([]);
  const [unread, setUnread] = useState(0);
  const [participants, setParticipants] = useState<string[]>([]);
  const [typing, setTyping] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      setDesigners(listDesigners());
      setCollections(listCollections());
    } catch {
      // ignore
    }
  }, [designer, collection]);

  // Poll unread + participants/typing using current room context
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const room = getCurrentCollab()?.room || 'default';
        const msgs = listMessages(room);
        const last = getLastOpenTs(room);
        const lastMs = last ? new Date(last).getTime() : 0;
        const count = msgs.filter(m => !m.self && new Date(m.ts).getTime() > lastMs).length;
        setUnread(count);
        const peers = listPeerSeen(room);
        setParticipants(Object.keys(peers).filter(Boolean).sort());
        const tmap = listTyping(room);
        const tnames: Record<string, boolean> = {};
        for (const name of Object.keys(tmap)) tnames[name] = true;
        setTyping(tnames);
      } catch { /* ignore */ }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const displayCategory = collection?.category === 'custom' ? collection?.customCategory : collection?.category;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="font-medium">Designer</div>
            {designer ? (
              <div className="mt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{designer.name || 'Unnamed'}</div>
                    <div className="text-muted-foreground">{designer.role || designer.style || '—'}{designer.experience ? ` · ${designer.experience}` : ''}</div>
                  </div>
                  {onSaveDesigner && (
                    <Button size="sm" variant="outline" onClick={onSaveDesigner}>Save</Button>
                  )}
                </div>
                {polishedBio && (
                  <div className="mt-2 text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                    {polishedBio}
                  </div>
                )}
                {(designer.website || designer.instagram || designer.phone || designer.email) && (
                  <div className="mt-2 text-xs space-y-0.5">
                    {designer.website && (<div><span className="text-muted-foreground">Web:</span> <a href={designer.website.startsWith('http') ? designer.website : `https://${designer.website}`} target="_blank" rel="noreferrer">{designer.website}</a></div>)}
                    {designer.email && (<div><span className="text-muted-foreground">Email:</span> <a href={`mailto:${designer.email}`}>{designer.email}</a></div>)}
                    {designer.instagram && (<div><span className="text-muted-foreground">IG:</span> {designer.instagram}</div>)}
                    {designer.twitter && (<div><span className="text-muted-foreground">X:</span> {designer.twitter}</div>)}
                    {designer.tiktok && (<div><span className="text-muted-foreground">TikTok:</span> {designer.tiktok}</div>)}
                    {designer.phone && (<div><span className="text-muted-foreground">Phone:</span> {designer.phone}</div>)}
                    {designer.address && (<div className="text-muted-foreground">{designer.address}</div>)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">No designer yet</div>
            )}
          </div>
          <div className="pt-2 border-t" />
          <div>
            <div className="font-medium">Collection</div>
            {collection ? (
              <div className="mt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{generatedTitle || collection.name || 'Untitled'}</div>
                    <div className="text-muted-foreground">{collection.launchYear || ''} · <span className="capitalize">{displayCategory || '—'}</span></div>
                  </div>
                  {onSaveCollection && (
                    <Button size="sm" variant="outline" onClick={onSaveCollection}>Save</Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">No collection yet</div>
            )}
          </div>
          <div className="pt-2 border-t" />
          <div className="flex items-center justify-between">
            <div>Images</div>
            <Badge variant="secondary">{imagesCount}</Badge>
          </div>
          {/* Import IDs moved to Catalogue page */}
          <Button variant="outline" className="w-full" onClick={()=> { const before = designers.length; const after = listDesigners(); setDesigners(after); const removed = Math.max(0, before - after.length); toast({ title: 'Designers repaired', description: removed ? `${removed} duplicate(s) removed` : 'No duplicates found' }); }}>Repair Designers</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved Designers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {designers.length === 0 && (
            <div className="text-muted-foreground">None saved yet</div>
          )}
          {designers.slice(0, 5).map((d) => (
            <button
              key={d.id}
              className="w-full text-left p-2 rounded hover:bg-muted"
              onClick={() => d.profile && onLoadDesigner?.(d.profile as DesignerProfile)}
              title={d.polishedProfile || ''}
            >
              <div className="font-medium">{d.name || 'Unnamed'}</div>
              <div className="text-muted-foreground truncate">{(d.profile?.style || '') + (d.profile?.experience ? ' · ' + d.profile.experience : '')}</div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved Collections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {collections.length === 0 && (
            <div className="text-muted-foreground">None saved yet</div>
          )}
          {collections.slice(0, 5).map((c) => (
            <button
              key={c.id}
              className="w-full text-left p-2 rounded hover:bg-muted"
              onClick={() => onLoadCollection?.(c.data as CollectionData, c.title, c.description)}
              title={c.description || ''}
            >
              <div className="font-medium">{c.title || c.data?.name || 'Untitled'}</div>
              <div className="text-muted-foreground truncate">{c.data?.launchYear || ''} · {(c.data?.category || c.data?.customCategory || '')}</div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Participants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {participants.length === 0 && (
            <div className="text-muted-foreground">No participants detected</div>
          )}
          {participants.map((name) => (
            <div key={name} className="flex items-center justify-between">
              <div>{name}</div>
              <div className={`text-xs ${typing[name] ? 'text-green-600' : 'text-muted-foreground'}`}>{typing[name] ? 'typing…' : ''}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="hidden">
        <CardHeader>
          <CardTitle className="text-base">Tools</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <Button variant="outline" className="w-full justify-between" onClick={()=> onOpenMessages?.()}>
            <span>Messages…</span>
            {unread > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.25rem] px-1 py-0.5 rounded bg-red-600 text-white text-[10px]">{unread}</span>
            )}
          </Button>
          {/* Import IDs lives in this section above; keep existing dialog block below */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tools</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">Import IDs…</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Piece IDs</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Paste IDs separated by spaces, commas, or new lines. We’ll select them in the Catalogue.</div>
                <textarea id="importIds" className="w-full border rounded p-2 text-sm" rows={6} placeholder="piece:abcd1234\npiece:ef901234" />
              </div>
              <DialogFooter>
                <Button onClick={()=> {
                  const el = document.getElementById('importIds') as HTMLTextAreaElement | null;
                  const val = (el?.value || '').trim();
                  try { localStorage.setItem('catalogue.import', val); } catch { /* ignore */ }
                  onNavigate?.('catalogue');
                }}>Apply</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
