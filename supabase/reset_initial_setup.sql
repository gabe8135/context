-- CONTEXTO / CTXT — limpa somente os objetos da instalação inicial.
-- Use apenas enquanto o projeto ainda não possui dados reais.

begin;

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.integrations cascade;
drop table if exists public.hosting_accounts cascade;
drop table if exists public.domains cascade;
drop table if exists public.financial_entries cascade;
drop table if exists public.alerts cascade;
drop table if exists public.activities cascade;
drop table if exists public.decisions cascade;
drop table if exists public.tasks cascade;
drop table if exists public.projects cascade;
drop table if exists public.clients cascade;
drop table if exists public.workspace_members cascade;
drop table if exists public.workspaces cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists private.is_workspace_member(uuid, public.workspace_role[]) cascade;

drop schema if exists private cascade;

drop type if exists public.health_status cascade;
drop type if exists public.financial_status cascade;
drop type if exists public.entry_type cascade;
drop type if exists public.severity_level cascade;
drop type if exists public.alert_status cascade;
drop type if exists public.priority_level cascade;
drop type if exists public.task_status cascade;
drop type if exists public.project_status cascade;
drop type if exists public.workspace_role cascade;

commit;
