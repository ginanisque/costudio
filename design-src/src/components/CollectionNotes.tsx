import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { listNotesByCollection, saveNote, updateNote, removeNote, type StoredNote } from '@/utils/storage';

export default function CollectionNotes({ collectionId }: { collectionId: string }) {
  const [notes, setNotes] = useState<StoredNote[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null);

  const reload = useCallback(() => {
    try { setNotes(listNotesByCollection(collectionId)); } catch { /* ignore */ }
  }, [collectionId]);
  useEffect(() => { reload(); }, [reload]);

  const onAdd = () => {
    const t = title.trim(); const b = body.trim(); if (!b) return;
    saveNote({ collectionId, title: t || undefined, body: b });
    setTitle(''); setBody(''); reload();
  };

  const onUpdate = (id: string, patch: Partial<StoredNote>) => { updateNote(id, patch); reload(); };

  React.useEffect(() => {
    const onNew = () => { setTitle(''); setBody(''); setEditing(null); setTimeout(() => bodyRef.current?.focus(), 50); };
    const onFocusNote = (e: Event) => { const detail = (e as CustomEvent<{ noteId?: string; collectionId?: string }>).detail; if (detail?.collectionId && detail.collectionId !== collectionId) return; if (detail?.noteId) setEditing(detail.noteId); };
    window.addEventListener('notes-new', onNew);
    window.addEventListener('notes-focus', onFocusNote);
    return () => { window.removeEventListener('notes-new', onNew); window.removeEventListener('notes-focus', onFocusNote); };
  }, [collectionId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input placeholder="Note title (optional)" value={title} onChange={(e)=> setTitle(e.target.value)} />
          <Textarea ref={bodyRef} rows={3} placeholder="Write a note about this collection…" value={body} onChange={(e)=> setBody(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={onAdd}>Add Note</Button>
            <Button variant="outline" onClick={()=> { setTitle(''); setBody(''); }}>Clear</Button>
          </div>
        </div>
        <div className="space-y-2">
          {notes.length === 0 && <div className="text-sm text-muted-foreground">No notes yet for this collection.</div>}
          {notes.map(n => (
            <div key={n.id} className="border rounded p-2">
              {editing === n.id ? (
                <div className="space-y-2">
                  <Input value={n.title || ''} onChange={(e)=> onUpdate(n.id, { title: e.target.value })} placeholder="Title" />
                  <Textarea rows={4} value={n.body} onChange={(e)=> onUpdate(n.id, { body: e.target.value })} />
                  <div className="text-xs text-muted-foreground">Updated {new Date(n.updatedAt || n.createdAt).toLocaleString()}</div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={()=> setEditing(null)}>Done</Button>
                    <Button size="sm" variant="destructive" onClick={()=> { removeNote(n.id); reload(); }}>Delete</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-medium">{n.title || 'Untitled'}</div>
                  <div className="whitespace-pre-wrap text-sm">{n.body}</div>
                  <div className="text-xs text-muted-foreground">Updated {new Date(n.updatedAt || n.createdAt).toLocaleString()}</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={()=> setEditing(n.id)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={()=> { removeNote(n.id); reload(); }}>Delete</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
