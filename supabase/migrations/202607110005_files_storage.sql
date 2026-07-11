begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('workspace-files','workspace-files',false,26214400,array['application/pdf','image/png','image/jpeg','image/webp','video/mp4','application/zip','application/x-zip-compressed','text/plain','text/csv','application/json','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table public.deliverables add column if not exists final_file_id uuid references public.files(id) on delete set null;
create index if not exists deliverables_final_file on public.deliverables(final_file_id) where final_file_id is not null;

drop policy if exists workspace_files_select on storage.objects;
drop policy if exists workspace_files_insert on storage.objects;
drop policy if exists workspace_files_update on storage.objects;
drop policy if exists workspace_files_delete on storage.objects;
create policy workspace_files_select on storage.objects for select to authenticated
using(bucket_id='workspace-files' and (select private.is_workspace_member(((storage.foldername(name))[1])::uuid)));
create policy workspace_files_insert on storage.objects for insert to authenticated
with check(bucket_id='workspace-files' and (select private.is_workspace_member(((storage.foldername(name))[1])::uuid,array['owner','admin','member']::public.workspace_role[])));
create policy workspace_files_update on storage.objects for update to authenticated
using(bucket_id='workspace-files' and (select private.is_workspace_member(((storage.foldername(name))[1])::uuid,array['owner','admin','member']::public.workspace_role[])))
with check(bucket_id='workspace-files' and (select private.is_workspace_member(((storage.foldername(name))[1])::uuid,array['owner','admin','member']::public.workspace_role[])));
create policy workspace_files_delete on storage.objects for delete to authenticated
using(bucket_id='workspace-files' and (select private.is_workspace_member(((storage.foldername(name))[1])::uuid,array['owner','admin']::public.workspace_role[])));
commit;
