import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
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

export default function CollaborationPanel(_props: CollaborationPanelProps & { openMessages?: boolean; onMessagesOpenChange?: (open: boolean) => void }) {
  const account = getUser();
  const handle = workspaceHandle(account?.businessName || 'Costudio');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [memberStatus, setMemberStatus] = useState('');
  const [adding, setAdding] = useState(false);

  const refreshMembers = useCallback(async () => {
    if (!supabase || !account) return;
    const { data, error } = await supabase.rpc('list_business_members', { target_business_id: account.businessId });
    if (error) {
      setMemberStatus('The member list is temporarily unavailable. Shared records and Workspace tasks are still available.');
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
      setMemberStatus('Member added. They now share this workspace.');
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

  const canManage = useMemo(() => members.some(member => member.user_id === account?.id && ['owner', 'admin'].includes(member.role)), [members, account?.id]);

  return (
    <Card>
      <CardHeader><CardTitle>Shared workspace</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded border bg-muted/30 p-3">
          <div className="text-lg font-semibold text-emerald-800">{handle}</div>
          <p className="mt-1 text-xs text-muted-foreground">Members work from the same saved designers, collections, clients, orders, and assigned production tasks.</p>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Members</div>
          {members.map(member => (
            <div key={member.user_id} className="flex items-center justify-between gap-2 rounded border px-3 py-2">
              <div className="min-w-0"><div className="truncate font-medium">{member.display_name}</div><div className="truncate text-xs text-muted-foreground">{member.email} · {member.role}</div></div>
              {canManage && member.role !== 'owner' && member.user_id !== account?.id && <Button size="sm" variant="ghost" onClick={() => void removeMember(member)}>Remove</Button>}
            </div>
          ))}
          {!members.length && !memberStatus && <div className="text-xs text-muted-foreground">Loading members…</div>}
        </div>

        {canManage && (
          <div className="space-y-2 rounded border p-3">
            <div className="font-medium">Add a registered Costudio user</div>
            <Input type="email" value={memberEmail} onChange={event => setMemberEmail(event.target.value)} placeholder="colleague@example.com" />
            <div className="flex gap-2">
              <select className="h-10 flex-1 rounded-md border bg-background px-3" value={memberRole} onChange={event => setMemberRole(event.target.value)}>
                <option value="member">Member</option><option value="designer">Designer</option><option value="costing">Costing</option><option value="measurements">Measurements</option><option value="admin">Admin</option>
              </select>
              <Button onClick={() => void addMember()} disabled={adding || !memberEmail.trim()}>{adding ? 'Adding…' : 'Add member'}</Button>
            </div>
            <p className="text-xs text-muted-foreground">The person must already have a registered Costudio account.</p>
          </div>
        )}
        {memberStatus && <div className="text-xs text-muted-foreground">{memberStatus}</div>}
        <Button className="w-full" onClick={() => { window.location.href = '/workspace/'; }}>Open shared Workspace</Button>
      </CardContent>
    </Card>
  );
}
