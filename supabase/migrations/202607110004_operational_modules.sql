begin;

create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  project_id uuid references public.projects(id), client_id uuid references public.clients(id),
  content text not null, item_type text not null default 'text', status text not null default 'unclassified',
  source_url text, classified_as text, created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.procedures (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  project_id uuid references public.projects(id), client_id uuid references public.clients(id),
  title text not null, category text, description text, steps text not null default '', checklist text,
  links text, version integer not null default 1 check(version > 0), status text not null default 'active',
  created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  project_id uuid not null references public.projects(id), client_id uuid references public.clients(id),
  name text not null, quantity integer not null default 1 check(quantity > 0), status text not null default 'planned',
  due_at timestamptz, value_cents bigint not null default 0 check(value_cents >= 0), points numeric(12,2) not null default 0,
  version integer not null default 1 check(version > 0), delivered_at timestamptz, approved_at timestamptz,
  notes text, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  project_id uuid references public.projects(id), client_id uuid references public.clients(id),
  service_name text not null, login_identifier text, access_url text, secret_ciphertext text,
  recovery_instructions text, status text not null default 'unverified', last_validated_at timestamptz,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
  project_id uuid references public.projects(id), client_id uuid references public.clients(id),
  logical_name text not null, category text, storage_path text not null, mime_type text not null,
  size_bytes bigint not null check(size_bytes >= 0), version integer not null default 1 check(version > 0),
  description text, is_current boolean not null default true, created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);

create index if not exists inbox_workspace_status on public.inbox_items(workspace_id,status,created_at desc);
create index if not exists procedures_workspace_category on public.procedures(workspace_id,category,updated_at desc) where archived_at is null;
create index if not exists deliverables_project_status on public.deliverables(project_id,status,due_at) where archived_at is null;
create index if not exists credentials_project_status on public.credentials(project_id,status) where archived_at is null;
create index if not exists files_project_current on public.files(project_id,is_current,created_at desc) where archived_at is null;

do $$ declare t text; begin
  foreach t in array array['inbox_items','procedures','deliverables','credentials','files'] loop
    execute format('drop trigger if exists set_updated_at on public.%I',t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('revoke all on public.%I from anon',t);
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists %I on public.%I',t||'_select',t);
    execute format('drop policy if exists %I on public.%I',t||'_insert',t);
    execute format('drop policy if exists %I on public.%I',t||'_update',t);
    execute format('drop policy if exists %I on public.%I',t||'_delete',t);
    execute format('create policy %I on public.%I for select to authenticated using((select private.is_workspace_member(workspace_id)))',t||'_select',t);
    execute format('create policy %I on public.%I for insert to authenticated with check((select private.is_workspace_member(workspace_id,array[''owner'',''admin'',''member'']::public.workspace_role[])))',t||'_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using((select private.is_workspace_member(workspace_id,array[''owner'',''admin'',''member'']::public.workspace_role[]))) with check((select private.is_workspace_member(workspace_id,array[''owner'',''admin'',''member'']::public.workspace_role[])))',t||'_update',t);
    execute format('create policy %I on public.%I for delete to authenticated using((select private.is_workspace_member(workspace_id,array[''owner'',''admin'']::public.workspace_role[])))',t||'_delete',t);
  end loop;
end $$;
commit;
