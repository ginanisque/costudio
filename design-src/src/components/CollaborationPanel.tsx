import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { connectCollab, setCurrentCollab } from '@/utils/collab';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import MessagesPanel from '@/components/MessagesPanel';
import { listMessages, getLastOpenTs, setLastOpenTs } from '@/utils/storage';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { getUser } from '@/utils/auth';
import { supabase } from '@/lib/supabase';

export type CollaborationPanelProps = {
  onReceive?: (type: string, payload: unknown) => void;
};

type WorkspaceMember = {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  joined_at: string;
};

const workspaceHandle = (name: string) => `@${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'costudio'}`;

export default function CollaborationPanel(props: CollaborationPanelProps & { openMessages?: boolean; onMessagesOpenChange?: (open: boolean) => void }) {
  const { onReceive } = props;
  const account = getUser();
  const room = account ? `workspace-${account.businessId}` : 'workspace-costudio';
  const handle = workspaceHandle(account?.businessName || 'Costudio');
  const [connected, setConnected] = useState(false);
  const [follow, setFollow] = useLocalStorage<boolean>('collab.follow', false);
  const [unread, setUnread] = useState(0);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [memberStatus, setMemberStatus] = useState('');
  const [adding, setAdding] = useState(false);

  const onReceiveRef = React.useRef(onReceive);
  React.useLayoutEffect(() => { onReceiveRef.current = onReceive; });

  useEffect(() => {
    const c = connectCollab(room, (type, payload) => onReceiveRef.current?.(type, payload));
    setCurrentCollab(c);
    setConnected(true);
    return () => { c.close(); setCurrentCollab(null); setConnected(false); };
  }, [room]);

  const refreshMembers = useCallback(async () => {
    if (!supabase || !account) return;
    const { data, error } = await supabase.rpc('list_business_members', { target_business_id: account.businessId });
    if (error) {
      setMemberStatus(error.message.includes('function') ? 'Run workspace collaboration migration 003 to manage members.' : error.message);
      return;
    }
    setMembers((data || []) as WorkspaceMember[]);
    setMemberStatus('');
  }, [account]);

  useEffect(() => { void refreshMembers(); }, [refreshMembers]);

  const addMember = async () => {
    if (!supabase || !account || !memberEmail.trim()) return;
    setAdding(true);
    setMemberStatus('');
    const { error } = await supabase.rpc('add_business_member', {
      target_business_id: account.businessId,
      member_email: memberEmail.trim().toLowerCase(),
      member_role: memberRole,
    });
    if (error) setMemberStatus(error.message);
    else {
      setMemberEmail('');
      setMemberStatus('Member added. They can select this workspace in Settings.');
      await refreshMembers();
    }
    setAdding(false);
  };

  const removeMember = async (member: WorkspaceMember) => {
    if (!supabase || !account || !confirm(`Remove ${member.display_name} from ${handle}?`)) return;
    const { error } = await supabase.rpc('remove_business_member', {
      target_business_id: account.businessId,
      target_user_id: member.user_id,
    });
    if (error) setMemberStatus(error.message);
    else await refreshMembers();
  };

  useEffect(() => {
    const id = setInterval(() => {
      try {
        const msgs = listMessages(room);
        const last = getLastOpenTs(room);
        const lastMs = last ? new Date(last).getTime() : 0;
        setUnread(msgs.filter(message => !message.self && new Date(message.ts).getTime() > lastMs).length);
      } catch { /* ignore */ }
    }, 1000);
    return () => clearInterval(id);
  }, [room]);

  const [msgsOpen, setMsgsOpen] = useState(false);
  const open = typeof props.openMessages === 'boolean' ? props.openMessages : msgsOpen;
  const onOpenChange = (value: boolean) => {
    if (typeof props.onMessagesOpenChange === 'function') props.onMessagesOpenChange(value);
    else setMsgsOpen(value);
  };
  const canManage = useMemo(() => members.some(member => member.user_id === account?.id && ['owner', 'admin'].includes(member.role)), [members, account?.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace collaboration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded border bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground">Shared workspace</div>
          <div className="text-lg font-semibold text-emerald-800">{handle}</div>
          <div className="text-xs text-muted-foreground">Connected: {connected ? 'Yes' : 'Connecting…'}</div>
        </div>

        <div className="flex items-center gap-2">
          <input id="follow" type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)} />
          <label htmlFor="follow">Follow collaborator navigation</label>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Members</div>
          {members.map(member => (
            <div key={member.user_id} className="flex items-center justify-between gap-2 rounded border px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{member.display_name}</div>
                <div className="truncate text-xs text-muted-foreground">{member.email || 'Demo member'} · {member.role}</div>
              </div>
              {canManage && member.role !== 'owner' && member.user_id !== account?.id && (
                <Button size="sm" variant="ghost" onClick={() => void removeMember(member)}>Remove</Button>
              )}
            </div>
          ))}
          {!members.length && <div className="text-xs text-muted-foreground">No member list available yet.</div>}
        </div>

        {canManage && (
          <div className="space-y-2 rounded border p-3">
            <div className="font-medium">Add a registered Costudio user</div>
            <Input type="email" value={memberEmail} onChange={event => setMemberEmail(event.target.value)} placeholder="colleague@example.com" />
            <div className="flex gap-2">
              <select className="h-10 flex-1 rounded-md border bg-background px-3" value={memberRole} onChange={event => setMemberRole(event.target.value)}>
                <option value="member">Member</option>
                <option value="designer">Designer</option>
                <option value="costing">Costing</option>
                <option value="measurements">Measurements</option>
                <option value="admin">Admin</option>
              </select>
              <Button onClick={() => void addMember()} disabled={adding || !memberEmail.trim()}>{adding ? 'Adding…' : 'Add member'}</Button>
            </div>
            <p className="text-xs text-muted-foreground">The person must already have a registered Costudio account.</p>
          </div>
        )}
        {memberStatus && <div className="text-xs text-muted-foreground">{memberStatus}</div>}

        <Dialog open={open} onOpenChange={value => { onOpenChange(value); if (value) setLastOpenTs(room, new Date().toISOString()); }}>
          <DialogTrigger asChild>
            <Button className="w-full" variant="outline">
              <span>Open workspace messages</span>
              {unread > 0 && <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded bg-red-600 px-1 py-0.5 text-[10px] text-white">{unread}</span>}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{handle} messages</DialogTitle></DialogHeader>
            <MessagesPanel />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
