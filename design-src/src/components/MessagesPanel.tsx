import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCurrentCollab, broadcast } from '@/utils/collab';
import { addMessage, clearMessages, listMessages, listPeerSeen, listTyping, type ChatMessage } from '@/utils/storage';

export default function MessagesPanel() {
  // getCurrentCollab() returns the module-level singleton — re-read on every render is fine,
  // but we only need to recompute when the collab client changes (tracked by a render cycle).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const room = useMemo(() => getCurrentCollab()?.room ?? 'default', []);
  const [author, setAuthor] = useState<string>(() => {
    try { return localStorage.getItem('collab.nick') || ''; } catch { return ''; }
  });
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => listMessages(room));
  const [peers, setPeers] = useState<Record<string, string>>(() => listPeerSeen(room));
  const [typers, setTypers] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastEmitRef = useRef(0);

  useEffect(() => {
    try { setMessages(listMessages(room)); setPeers(listPeerSeen(room)); } catch { /* ignore */ }
  }, [room]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Announce seen when messages change or author changes
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    const ts = last.ts;
    const who = (author || '').trim();
    try { broadcast('message_seen', { author: who || undefined, ts }); } catch { /* ignore */ }
  }, [messages, author]);

  // Poll peer seen info from storage (updated by Index receiver)
  useEffect(() => {
    const id = setInterval(() => {
      try {
        setPeers(listPeerSeen(room));
        const typingMap = listTyping(room);
        const names = Object.keys(typingMap);
        setTypers(names);
      } catch { /* ignore */ }
    }, 1000);
    return () => clearInterval(id);
  }, [room]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    const msg: ChatMessage = { id: Math.random().toString(36).slice(2), author: author || undefined, text: t, ts: new Date().toISOString(), self: true };
    try { addMessage(room, msg); setMessages(listMessages(room)); } catch { /* ignore */ }
    try {
      broadcast('message', { author: msg.author, text: msg.text, ts: msg.ts });
      // also ping to request opening the dialog remotely
      broadcast('message_ping', { ts: msg.ts });
    } catch { /* ignore */ }
    setText('');
    try { localStorage.setItem('collab.nick', author || ''); } catch { /* ignore */ }
  };

  return (
    <div className="flex flex-col h-[60vh]">
      <div className="flex items-center gap-2 mb-2">
        <Input placeholder="Your name (optional)" value={author} onChange={(e)=> setAuthor(e.target.value)} />
        <Button variant="outline" onClick={()=> { clearMessages(room); setMessages([]); }}>Clear</Button>
      </div>
      <div className="flex-1 overflow-auto border rounded p-2 space-y-2 bg-white">
        {messages.map((m, idx) => (
          <div key={m.id} className={`text-sm ${m.self ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block max-w-[80%] px-3 py-2 rounded ${m.self ? 'bg-primary text-primary-foreground' : 'bg-gray-100'}`}>
              <div className="text-[10px] opacity-80">{m.author || (m.self ? 'You' : 'Anon')} · {new Date(m.ts).toLocaleTimeString()}</div>
              <div className="whitespace-pre-wrap break-words">{m.text}</div>
            </div>
            {/* Seen by (for last self message only) */}
            {m.self && idx === messages.findLastIndex(mm => mm.self) && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                {(() => {
                  const names = Object.entries(peers).filter(([, t]) => new Date(t).getTime() >= new Date(m.ts).getTime()).map(([n]) => n).filter(Boolean);
                  return names.length ? `Seen by ${names.join(', ')}` : '';
                })()}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {typers.length > 0 && (
        <div className="mt-1 text-[10px] text-muted-foreground">{typers.join(', ')} {typers.length > 1 ? 'are' : 'is'} typing…</div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <Input placeholder="Type a message" value={text} onChange={(e)=> {
          setText(e.target.value);
          const now = Date.now();
          if (now - lastEmitRef.current > 1200) {
            try { broadcast('typing', { author: author || undefined, ts: new Date().toISOString() }); } catch { /* ignore */ }
            lastEmitRef.current = now;
          }
        }} onKeyDown={(e)=> { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <Button onClick={send}>Send</Button>
      </div>
    </div>
  );
}
