import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { connectCollab, randomRoomId, type CollabClient, setCurrentCollab } from '@/utils/collab';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import MessagesPanel from '@/components/MessagesPanel';
import { listMessages, getLastOpenTs, setLastOpenTs } from '@/utils/storage';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export type CollaborationPanelProps = {
  onReceive?: (type: string, payload: unknown) => void;
};

export default function CollaborationPanel(props: CollaborationPanelProps & { openMessages?: boolean; onMessagesOpenChange?: (open: boolean) => void }) {
  const { onReceive } = props;
  const queryRoom = new URLSearchParams(location.search).get('room') || '';
  const [room, setRoom] = useState(queryRoom || randomRoomId());
  const [client, setClient] = useState<CollabClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [follow, setFollow] = useLocalStorage<boolean>('collab.follow', false);

  const inviteUrl = useMemo(() => `${location.origin}${location.pathname}?room=${encodeURIComponent(room)}`, [room]);
  const [unread, setUnread] = useState(0);

  const onReceiveRef = React.useRef(onReceive);
  React.useLayoutEffect(() => { onReceiveRef.current = onReceive; });

  useEffect(() => {
    if (!queryRoom) return;
    // auto-connect; use ref so the handler always calls the latest onReceive
    const c = connectCollab(queryRoom, (t, p) => onReceiveRef.current?.(t, p));
    setClient(c);
    setCurrentCollab(c);
    setConnected(true);
    return () => { c.close(); setCurrentCollab(null); };
  }, [queryRoom]);

  const connect = () => {
    if (client) client.close();
    const c = connectCollab(room, (t,p)=> onReceive?.(t,p));
    setClient(c);
    setConnected(true);
    setCurrentCollab(c);
  };
  const disconnect = () => { client?.close(); setConnected(false); setCurrentCollab(null); };

  // Poll unread count per room
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const msgs = listMessages(room);
        const last = getLastOpenTs(room);
        const lastMs = last ? new Date(last).getTime() : 0;
        const count = msgs.filter(m => !m.self && new Date(m.ts).getTime() > lastMs).length;
        setUnread(count);
      } catch { /* ignore */ }
    }, 1000);
    return () => clearInterval(id);
  }, [room]);

  const [msgsOpen, setMsgsOpen] = useState(false);
  const open = typeof props.openMessages === 'boolean' ? props.openMessages : msgsOpen;
  const onOpenChange = (o: boolean) => {
    if (typeof props.onMessagesOpenChange === 'function') props.onMessagesOpenChange(o);
    else setMsgsOpen(o);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collaboration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-2">
          <label className="text-xs">Room ID</label>
          <div className="flex gap-2">
            <Input value={room} onChange={(e)=> setRoom(e.target.value)} />
            {connected ? (
              <Button variant="outline" onClick={disconnect}>Disconnect</Button>
            ) : (
              <Button onClick={connect}>Connect</Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input id="follow" type="checkbox" checked={follow} onChange={(e)=> setFollow(e.target.checked)} />
          <label htmlFor="follow">Follow collaborator navigation</label>
        </div>
        <div className="space-y-1">
          <div className="font-medium">Invite link</div>
          <div className="flex gap-2">
            <Input readOnly value={inviteUrl} />
            <Button variant="outline" onClick={()=> navigator.clipboard.writeText(inviteUrl)}>Copy</Button>
          </div>
        </div>
        <div className="text-muted-foreground">Connected: {connected ? 'Yes' : 'No'}</div>
        <div>
          <Dialog open={open} onOpenChange={(o)=> { onOpenChange(o); if (o) try { setLastOpenTs(room, new Date().toISOString()) } catch { /* ignore */ } }}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                <span>Open Messages…</span>
                {unread > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] px-1 py-0.5 rounded bg-red-600 text-white text-[10px]">{unread}</span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Room Messages</DialogTitle>
              </DialogHeader>
              <MessagesPanel />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
