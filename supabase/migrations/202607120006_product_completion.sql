begin;

-- Financeiro: recebimentos parciais e agrupamento de parcelas.
alter table public.financial_entries add column if not exists paid_amount_cents bigint not null default 0 check (paid_amount_cents >= 0);
alter table public.financial_entries add column if not exists category text;
alter table public.financial_entries add column if not exists installment_group_id uuid;
alter table public.financial_entries add column if not exists installment_number integer check (installment_number is null or installment_number > 0);
alter table public.financial_entries add column if not exists installment_total integer check (installment_total is null or installment_total > 0);
alter table public.financial_entries add column if not exists receipt_file_id uuid references public.files(id) on delete set null;
update public.financial_entries set paid_amount_cents=amount_cents where status='paid' and paid_amount_cents=0;

-- Tarefas completas.
alter table public.tasks add column if not exists parent_task_id uuid references public.tasks(id) on delete cascade;
alter table public.tasks add column if not exists checklist jsonb not null default '[]'::jsonb;
alter table public.tasks add column if not exists recurrence_rule text;
alter table public.tasks add column if not exists reminder_at timestamptz;
alter table public.tasks add column if not exists estimate_minutes integer check (estimate_minutes is null or estimate_minutes >= 0);
alter table public.tasks add column if not exists time_spent_minutes integer not null default 0 check (time_spent_minutes >= 0);
alter table public.tasks add column if not exists origin text not null default 'manual';

-- Conteúdo rico e histórico imutável de notas/procedimentos.
alter table public.notes add column if not exists content_json jsonb;
alter table public.notes add column if not exists version integer not null default 1 check (version > 0);
create table if not exists public.note_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade, version integer not null,
  title text not null, content text not null default '', content_json jsonb, status text not null,
  changed_by uuid references auth.users(id), created_at timestamptz not null default now(), unique(note_id,version)
);
create table if not exists public.procedure_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  procedure_id uuid not null references public.procedures(id) on delete cascade, version integer not null,
  title text not null, description text, steps text not null default '', checklist text, links text,
  changed_by uuid references auth.users(id), created_at timestamptz not null default now(), unique(procedure_id,version)
);

-- Agenda única para reunião, prazo, cobrança, lembrete e evento manual.
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade, client_id uuid references public.clients(id) on delete set null,
  title text not null, description text, event_type text not null default 'event', starts_at timestamptz not null,
  ends_at timestamptz, all_day boolean not null default false, location text, meeting_url text,
  recurrence_rule text, reminder_minutes integer[] not null default '{}', status text not null default 'scheduled',
  source_type text, source_id uuid, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), archived_at timestamptz
);

-- Relações livres, etiquetas e organização transversal.
create table if not exists public.entity_relations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_type text not null, source_id uuid not null, target_type text not null, target_id uuid not null,
  relation_type text not null default 'related', label text, created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), unique(workspace_id,source_type,source_id,target_type,target_id,relation_type)
);
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, color text, created_at timestamptz not null default now(), unique(workspace_id,name)
);
create table if not exists public.entity_tags (
  workspace_id uuid not null references public.workspaces(id) on delete cascade, tag_id uuid not null references public.tags(id) on delete cascade,
  entity_type text not null, entity_id uuid not null, created_at timestamptz not null default now(), primary key(tag_id,entity_type,entity_id)
);

-- Modelos reproduzíveis de projeto.
create table if not exists public.project_templates (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, description text, default_priority public.priority_level not null default 'medium',
  default_duration_days integer check(default_duration_days is null or default_duration_days > 0), active boolean not null default true,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.project_template_items (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  template_id uuid not null references public.project_templates(id) on delete cascade, item_type text not null,
  title text not null, description text, position integer not null default 0, offset_days integer,
  payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

-- Preferências, onboarding e regras de alerta configuráveis.
create table if not exists public.user_preferences (
  workspace_id uuid not null references public.workspaces(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  locale text not null default 'pt-BR', timezone text not null default 'America/Sao_Paulo', currency text not null default 'BRL',
  week_starts_on smallint not null default 1 check(week_starts_on between 0 and 6), default_project_view text not null default 'list',
  onboarding_completed_at timestamptz, onboarding_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(workspace_id,user_id)
);
create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, event_type text not null, enabled boolean not null default true, severity public.severity_level not null default 'medium',
  days_before integer not null default 0, conditions jsonb not null default '{}'::jsonb, channels text[] not null default '{in_app}',
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.deliverables add column if not exists responsible_name text;
alter table public.deliverables add column if not exists acceptance_criteria text;
alter table public.deliverables add column if not exists public_url text;

create index if not exists calendar_events_workspace_date on public.calendar_events(workspace_id,starts_at) where archived_at is null;
create index if not exists relations_source on public.entity_relations(workspace_id,source_type,source_id);
create index if not exists relations_target on public.entity_relations(workspace_id,target_type,target_id);
create index if not exists template_items_order on public.project_template_items(template_id,item_type,position);
create index if not exists financial_installments on public.financial_entries(installment_group_id,installment_number);
create index if not exists task_parent on public.tasks(parent_task_id) where parent_task_id is not null;

do $$ declare t text; begin
  foreach t in array array['calendar_events','project_templates','user_preferences','alert_rules'] loop
    execute format('drop trigger if exists set_updated_at on public.%I',t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
  end loop;
end $$;

do $$ declare t text; begin
  foreach t in array array['note_versions','procedure_versions','calendar_events','entity_relations','tags','entity_tags','project_templates','project_template_items','user_preferences','alert_rules'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('revoke all on public.%I from anon',t);
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
