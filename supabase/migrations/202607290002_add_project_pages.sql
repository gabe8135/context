create table if not exists public.project_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.project_pages(id) on delete cascade,
  title text not null default 'Sem título',
  slug text not null,
  content text not null default '',
  position integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint project_pages_not_self_parent check (parent_id is null or parent_id <> id)
);

create unique index if not exists project_pages_sibling_slug_idx
  on public.project_pages (
    project_id,
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    slug
  )
  where archived_at is null;

create index if not exists project_pages_workspace_project_idx
  on public.project_pages(workspace_id, project_id);
create index if not exists project_pages_parent_position_idx
  on public.project_pages(parent_id, position)
  where archived_at is null;

drop trigger if exists set_updated_at on public.project_pages;
create trigger set_updated_at
  before update on public.project_pages
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.project_pages to authenticated;
revoke all on public.project_pages from anon;
alter table public.project_pages enable row level security;

create policy project_pages_select on public.project_pages
  for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));

create policy project_pages_insert on public.project_pages
  for insert to authenticated
  with check (
    (select private.is_workspace_member(
      workspace_id,
      array['owner','admin','member']::public.workspace_role[]
    ))
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.workspace_id = workspace_id
    )
    and (
      parent_id is null or exists (
        select 1 from public.project_pages parent
        where parent.id = parent_id
          and parent.workspace_id = workspace_id
          and parent.project_id = project_id
          and parent.archived_at is null
      )
    )
  );

create policy project_pages_update on public.project_pages
  for update to authenticated
  using ((select private.is_workspace_member(
    workspace_id,
    array['owner','admin','member']::public.workspace_role[]
  )))
  with check (
    (select private.is_workspace_member(
      workspace_id,
      array['owner','admin','member']::public.workspace_role[]
    ))
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.workspace_id = workspace_id
    )
    and (
      parent_id is null or exists (
        select 1 from public.project_pages parent
        where parent.id = parent_id
          and parent.workspace_id = workspace_id
          and parent.project_id = project_id
          and parent.archived_at is null
      )
    )
  );

create policy project_pages_delete on public.project_pages
  for delete to authenticated
  using ((select private.is_workspace_member(
    workspace_id,
    array['owner','admin']::public.workspace_role[]
  )));

comment on table public.project_pages is
  'Páginas e subpáginas hierárquicas dos documentos de projeto.';
