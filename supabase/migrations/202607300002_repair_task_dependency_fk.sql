begin;

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

notify pgrst, 'reload schema';

commit;
