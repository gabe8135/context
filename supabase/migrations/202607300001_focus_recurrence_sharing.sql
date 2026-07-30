begin;

alter table public.tasks
  add column if not exists depends_on_task_id uuid references public.tasks(id) on delete set null,
  add column if not exists recurrence_interval integer not null default 1 check (recurrence_interval > 0),
  add column if not exists recurrence_ends_at date,
  add column if not exists recurrence_source_id uuid references public.tasks(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tasks'::regclass
      and conname = 'tasks_depends_on_task_id_fkey'
  ) then
    alter table public.tasks
      add constraint tasks_depends_on_task_id_fkey
      foreign key (depends_on_task_id) references public.tasks(id) on delete set null;
  end if;
end $$;

alter table public.calendar_events
  add column if not exists recurrence_interval integer not null default 1 check (recurrence_interval > 0),
  add column if not exists recurrence_ends_at date,
  add column if not exists recurrence_source_id uuid references public.calendar_events(id) on delete set null;

alter table public.project_templates
  add column if not exists template_key text,
  add column if not exists is_builtin boolean not null default false;

create table if not exists public.project_public_shares (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, project_id)
);

create index if not exists tasks_dependency_idx on public.tasks(depends_on_task_id)
  where depends_on_task_id is not null;
create index if not exists tasks_recurrence_idx on public.tasks(workspace_id, recurrence_source_id)
  where recurrence_source_id is not null;
create index if not exists calendar_recurrence_idx on public.calendar_events(workspace_id, recurrence_source_id)
  where recurrence_source_id is not null;
create index if not exists project_public_shares_token_idx on public.project_public_shares(token)
  where active;

drop trigger if exists set_updated_at on public.project_public_shares;
create trigger set_updated_at before update on public.project_public_shares
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.project_public_shares to authenticated;
revoke all on public.project_public_shares from anon;
alter table public.project_public_shares enable row level security;

create policy project_public_shares_select on public.project_public_shares
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy project_public_shares_insert on public.project_public_shares
for insert to authenticated
with check ((select private.is_workspace_member(
  workspace_id,
  array['owner','admin','member']::public.workspace_role[]
)));

create policy project_public_shares_update on public.project_public_shares
for update to authenticated
using ((select private.is_workspace_member(
  workspace_id,
  array['owner','admin','member']::public.workspace_role[]
)))
with check ((select private.is_workspace_member(
  workspace_id,
  array['owner','admin','member']::public.workspace_role[]
)));

create policy project_public_shares_delete on public.project_public_shares
for delete to authenticated
using ((select private.is_workspace_member(
  workspace_id,
  array['owner','admin']::public.workspace_role[]
)));

commit;
