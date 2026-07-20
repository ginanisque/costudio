import React from 'react';
import { Command } from 'cmdk';
import { listPieces, listDesigners, listCollections, listNotesByCollection } from '@/utils/storage';

type Props = Record<string, never>;

export default function CommandPalette(_props: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const close = () => setOpen(false);

  const nav = (tab: string) => { window.dispatchEvent(new CustomEvent('app-navigate', { detail: { tab } })); close(); };
  const openMessages = () => { window.dispatchEvent(new CustomEvent('open-messages')); close(); };
  const importIds = (ids: string[]) => {
    try { localStorage.setItem('catalogue.import', ids.join('\n')); } catch { /* ignore */ }
    nav('catalogue');
  };
  const newNote = () => { window.dispatchEvent(new CustomEvent('notes-new')); nav('collection'); };

  const designers = React.useMemo(() => listDesigners(), []);
  const collections = React.useMemo(() => listCollections(), []);
  const pieces = React.useMemo(() => listPieces().slice(0, 2000), []);
  const notes = React.useMemo(() => collections.flatMap(c => listNotesByCollection(c.id).map(n => ({...n, collection: c}))), [collections]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/20">
      <div className="mx-auto mt-24 max-w-2xl">
        <Command label="Global Command Palette" className="rounded-lg border bg-white shadow-xl overflow-hidden">
          <Command.Input value={query} onValueChange={setQuery} placeholder="Type a command or search…" className="w-full p-3 outline-none" />
          <Command.List className="max-h-[50vh] overflow-auto">
            <Command.Empty className="p-3 text-sm text-muted-foreground">No results</Command.Empty>

            <Command.Group heading="Actions">
              <Command.Item onSelect={()=> openMessages()}>Open Messages</Command.Item>
              <Command.Item onSelect={()=> importIds([''])}>Import IDs…</Command.Item>
              <Command.Item onSelect={()=> newNote()}>New Note…</Command.Item>
              <Command.Separator alwaysRender className="my-1" />
              <Command.Item onSelect={()=> nav('profile')}>Go to: Profile</Command.Item>
              <Command.Item onSelect={()=> nav('collection')}>Go to: Collection</Command.Item>
              <Command.Item onSelect={()=> nav('generate')}>Go to: Generate</Command.Item>
              <Command.Item onSelect={()=> nav('gallery')}>Go to: Gallery</Command.Item>
              <Command.Item onSelect={()=> nav('catalogue')}>Go to: Catalogue</Command.Item>
              <Command.Item onSelect={()=> nav('export')}>Go to: Export</Command.Item>
            </Command.Group>

            <Command.Group heading="Piece IDs">
              {pieces.filter(p => !query || (p.id + ' ' + p.prompt).toLowerCase().includes(query.toLowerCase())).slice(0, 20).map(p => (
                <Command.Item key={p.id} value={p.id} onSelect={()=> importIds([p.id])}>
                  {p.id} — {p.prompt.slice(0, 60)}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Designers">
              {designers.filter(d => !query || (d.name + ' ' + (d.profile?.style||'')).toLowerCase().includes(query.toLowerCase())).slice(0, 20).map(d => (
                <Command.Item key={d.id} onSelect={()=> { window.dispatchEvent(new CustomEvent('load-designer', { detail: { profile: d.profile } })); nav('profile'); }}>
                  {d.name} — {(d.profile?.style || '').toString()}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Collections">
              {collections.filter(c => {
                const t = (c.title || c.data?.name || '') + ' ' + (c.description || c.data?.inspiration || '');
                return !query || t.toLowerCase().includes(query.toLowerCase());
              }).slice(0, 20).map(c => (
                <Command.Item key={c.id} onSelect={()=> { window.dispatchEvent(new CustomEvent('load-collection', { detail: { data: c.data, title: c.title, description: c.description } })); nav('collection'); }}>
                  {c.title || c.data?.name || c.id}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Notes">
              {notes.filter(n => !query || (n.title + ' ' + n.body).toLowerCase().includes(query.toLowerCase())).slice(0, 20).map(n => (
                <Command.Item key={n.id} onSelect={()=> { window.dispatchEvent(new CustomEvent('load-collection', { detail: { data: n.collection.data, title: n.collection.title, description: n.collection.description } })); nav('collection'); window.dispatchEvent(new CustomEvent('notes-focus', { detail: { noteId: n.id, collectionId: n.collection.id } })); }}>
                  {(n.title || 'Untitled')} — {n.body.slice(0, 60)}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
      <div className="fixed inset-0" onClick={()=> setOpen(false)} />
    </div>
  );
}

