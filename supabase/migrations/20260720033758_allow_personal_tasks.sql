-- Tasks may belong to the workspace itself instead of a project.
-- RLS remains workspace-based, so personal tasks keep the same isolation.
alter table public.tasks
  alter column project_id drop not null;
