alter table public.projects
  add column if not exists documentation_content text not null default '',
  add column if not exists documentation_updated_at timestamptz;

comment on column public.projects.documentation_content is
  'Living project document maintained by workspace members.';

comment on column public.projects.documentation_updated_at is
  'Timestamp of the latest project document save.';
