import { supabase } from '@/lib/supabase';

export type CollabClient = {
  send: (type: string, payload: unknown) => void;
  close: () => void;
  room: string;
};

export function connectCollab(
  room: string,
  onMessage: (type: string, payload: unknown) => void,
): CollabClient {
  if (supabase) {
    const channel = supabase
      .channel(`costudio:${room}`)
      .on('broadcast', { event: 'studio-event' }, ({ payload }) => {
        const message = payload as { type?: string; payload?: unknown };
        if (message?.type) onMessage(message.type, message.payload);
      })
      .subscribe();

    return {
      send: (type, payload) => {
        void channel.send({
          type: 'broadcast',
          event: 'studio-event',
          payload: { type, payload },
        });
      },
      close: () => { void supabase.removeChannel(channel); },
      room,
    };
  }

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws?room=${encodeURIComponent(room)}`);
  const pending: string[] = [];
  ws.addEventListener('open', () => {
    while (pending.length && ws.readyState === WebSocket.OPEN) {
      ws.send(pending.shift()!);
    }
  });
  ws.addEventListener('message', ev => {
    try {
      const msg = JSON.parse(String(ev.data)) as { type?: string; payload?: unknown };
      if (msg && msg.type) onMessage(msg.type, msg.payload);
    } catch { /* ignore */ }
  });
  return {
    send: (type, payload) => {
      try {
        const message = JSON.stringify({ type, payload });
        if (ws.readyState === WebSocket.OPEN) ws.send(message);
        else if (ws.readyState === WebSocket.CONNECTING) pending.push(message);
      } catch { /* ignore */ }
    },
    close: () => {
      try { ws.close(); } catch { /* ignore */ }
    },
    room,
  };
}

export function randomRoomId() {
  return Math.random().toString(36).slice(2, 10);
}

let currentClient: CollabClient | null = null;
export function setCurrentCollab(client: CollabClient | null) { currentClient = client; }
export function getCurrentCollab(): CollabClient | null { return currentClient; }
export function broadcast(type: string, payload: unknown) { currentClient?.send(type, payload); }
