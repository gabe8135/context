-- Manual execution order for project and personal task queues.
-- Lower values appear first. Dates and priority remain descriptive metadata.
alter table public.tasks
  add column if not exists queue_position bigint;

with ranked as (
  select
    id,
    row_number() over (
      partition by workspace_id, project_id
      order by due_at asc nulls last, created_at asc, id asc
    ) * 1000 as position
  from public.tasks
)
update public.tasks as task
set queue_position = ranked.position
from ranked
where task.id = ranked.id
  and task.queue_position is null;

alter table public.tasks
  alter column queue_position set default ((extract(epoch from clock_timestamp()) * 1000000)::bigint);

create index if not exists tasks_workspace_project_queue_idx
  on public.tasks (workspace_id, project_id, queue_position)
  where archived_at is null;
