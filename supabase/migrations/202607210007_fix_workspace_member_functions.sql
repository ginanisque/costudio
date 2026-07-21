-- Correct return types for member-management functions.
-- auth.users.email is varchar while the public RPC contract returns text.

create or replace function public.list_business_members(target_business_id uuid)
returns table (user_id uuid, display_name text, email text, role text, joined_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_business_member(target_business_id) then
    raise exception 'You do not have access to this workspace.' using errcode = '42501';
  end if;
  return query
  select bm.user_id,
         coalesce(nullif(p.display_name, ''), nullif(u.email, ''), 'Costudio member')::text,
         coalesce(u.email, '')::text,
         bm.role::text,
         bm.created_at
  from public.business_members bm
  join auth.users u on u.id = bm.user_id
  left join public.profiles p on p.id = bm.user_id
  where bm.business_id = target_business_id
  order by case bm.role when 'owner' then 0 when 'admin' then 1 else 2 end, bm.created_at;
end;
$$;

create or replace function public.add_business_member(target_business_id uuid, member_email text, member_role text default 'member')
returns table (user_id uuid, display_name text, email text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare invited_user_id uuid;
begin
  if not exists (select 1 from public.business_members where business_id=target_business_id and user_id=auth.uid() and business_members.role in ('owner','admin')) then
    raise exception 'Only workspace owners and admins can add members.' using errcode = '42501';
  end if;
  if member_role not in ('admin','designer','costing','measurements','member') then
    raise exception 'Invalid workspace role.' using errcode = '22023';
  end if;
  select id into invited_user_id from auth.users where lower(email)=lower(trim(member_email)) limit 1;
  if invited_user_id is null then
    raise exception 'No registered Costudio user has that email address.' using errcode = 'P0002';
  end if;
  insert into public.business_members (business_id,user_id,role) values (target_business_id,invited_user_id,member_role)
  on conflict (business_id,user_id) do update set role=excluded.role;
  return query
  select invited_user_id,
         coalesce(nullif(p.display_name,''),member_email)::text,
         coalesce(u.email,'')::text,
         bm.role::text
  from public.business_members bm
  join auth.users u on u.id=bm.user_id
  left join public.profiles p on p.id=bm.user_id
  where bm.business_id=target_business_id and bm.user_id=invited_user_id;
end;
$$;

revoke all on function public.list_business_members(uuid) from public;
revoke all on function public.add_business_member(uuid,text,text) from public;
grant execute on function public.list_business_members(uuid) to authenticated;
grant execute on function public.add_business_member(uuid,text,text) to authenticated;
