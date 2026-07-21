-- Central business defaults shared by Workspace, Design, Costing and CRM.
-- Run once in the Supabase SQL Editor after migration 004.

alter table public.businesses
  add column if not exists legal_name text not null default '',
  add column if not exists business_email text not null default '',
  add column if not exists phone_primary text not null default '',
  add column if not exists phone_secondary text not null default '',
  add column if not exists website text not null default '',
  add column if not exists address_line_1 text not null default '',
  add column if not exists address_line_2 text not null default '',
  add column if not exists city text not null default '',
  add column if not exists state_region text not null default '',
  add column if not exists postal_code text not null default '',
  add column if not exists country_code text not null default 'NG',
  add column if not exists logo_data_url text not null default '',
  add column if not exists tax_id text not null default '',
  add column if not exists measurement_record_unit text not null default 'cm';

alter table public.businesses drop constraint if exists businesses_measurement_record_unit_check;
alter table public.businesses add constraint businesses_measurement_record_unit_check
  check (measurement_record_unit in ('cm', 'in'));

create or replace function public.is_business_admin(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_members
    where business_id = target_business_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

drop policy if exists "businesses_update_owner" on public.businesses;
drop policy if exists "businesses_update_admin" on public.businesses;
create policy "businesses_update_admin" on public.businesses
for update using (public.is_business_admin(id))
with check (public.is_business_admin(id));

revoke all on function public.is_business_admin(uuid) from public;
grant execute on function public.is_business_admin(uuid) to authenticated;
