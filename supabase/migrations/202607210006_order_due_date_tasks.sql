-- Order deadlines and their linked Workspace task.
-- Run once in the Supabase SQL Editor after migration 005.

alter table public.crm_orders
  add column if not exists due_date date;

alter table public.workspace_tasks
  add column if not exists source_type text,
  add column if not exists source_id text;

create unique index if not exists workspace_tasks_source_idx
  on public.workspace_tasks (business_id, source_type, source_id);

create index if not exists crm_orders_business_due_idx
  on public.crm_orders (business_id, due_date)
  where due_date is not null;

