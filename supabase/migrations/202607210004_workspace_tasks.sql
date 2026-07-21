-- Mini work-management layer for the Costudio workspace homepage.
-- Run after migrations 001-003.

create table if not exists public.workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text not null default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assignee_id uuid references auth.users(id) on delete set null,
  due_date date,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists workspace_tasks_business_status_idx on public.workspace_tasks (business_id, status, updated_at desc);
create index if not exists workspace_tasks_assignee_idx on public.workspace_tasks (assignee_id, due_date);
create index if not exists workspace_messages_business_created_idx on public.workspace_messages (business_id, created_at desc);

drop trigger if exists workspace_tasks_touch_updated_at on public.workspace_tasks;
create trigger workspace_tasks_touch_updated_at before update on public.workspace_tasks
for each row execute function public.touch_updated_at();

alter table public.workspace_tasks enable row level security;
alter table public.workspace_messages enable row level security;

drop policy if exists "workspace_tasks_member_all" on public.workspace_tasks;
create policy "workspace_tasks_member_all" on public.workspace_tasks
for all using (public.is_business_member(business_id))
with check (
  public.is_business_member(business_id)
  and (assignee_id is null or exists (
    select 1 from public.business_members
    where business_members.business_id = workspace_tasks.business_id
      and business_members.user_id = workspace_tasks.assignee_id
  ))
);

drop policy if exists "workspace_messages_member_all" on public.workspace_messages;
create policy "workspace_messages_member_all" on public.workspace_messages
for all using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

grant select, insert, update, delete on public.workspace_tasks to authenticated;
grant select, insert, update, delete on public.workspace_messages to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.workspace_tasks;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.workspace_messages;
exception when duplicate_object then null;
end $$;
