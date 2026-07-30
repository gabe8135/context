create or replace function private.is_valid_project_page_parent(
  checked_parent_id uuid,
  checked_project_id uuid,
  checked_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select checked_parent_id is null or exists (
    select 1
    from public.project_pages parent
    where parent.id = checked_parent_id
      and parent.project_id = checked_project_id
      and parent.workspace_id = checked_workspace_id
      and parent.archived_at is null
  );
$$;

revoke all on function private.is_valid_project_page_parent(uuid, uuid, uuid) from public;
grant execute on function private.is_valid_project_page_parent(uuid, uuid, uuid) to authenticated;

alter table public.project_pages
  alter column title set default 'Sem título';

update public.project_pages
set title = 'Sem título'
where title in ('', 'Sem tÃ­tulo');

drop policy if exists project_pages_insert on public.project_pages;
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
    and (select private.is_valid_project_page_parent(parent_id, project_id, workspace_id))
  );

drop policy if exists project_pages_update on public.project_pages;
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
    and (select private.is_valid_project_page_parent(parent_id, project_id, workspace_id))
  );
