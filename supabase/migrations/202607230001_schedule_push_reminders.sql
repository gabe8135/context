-- Supabase Cron replaces Vercel Cron so reminders also work on Vercel Hobby.
-- Runtime values are read from Vault and are never committed to the repository.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function private.dispatch_squire_reminders()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  app_url text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret
    into app_url
    from vault.decrypted_secrets
   where name = 'squire_app_url'
   limit 1;

  select decrypted_secret
    into cron_secret
    from vault.decrypted_secrets
   where name = 'squire_cron_secret'
   limit 1;

  if nullif(btrim(app_url), '') is null
     or nullif(btrim(cron_secret), '') is null then
    raise warning 'Squire reminder cron skipped: Vault secrets are not configured';
    return null;
  end if;

  select net.http_get(
    url := regexp_replace(app_url, '/+$', '') || '/api/cron/reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret,
      'User-Agent', 'Squire-Supabase-Cron/1.0'
    ),
    timeout_milliseconds := 55000
  )
  into request_id;

  return request_id;
end;
$$;

revoke all on function private.dispatch_squire_reminders()
  from public, anon, authenticated;

do $$
declare
  existing_job bigint;
begin
  select jobid
    into existing_job
    from cron.job
   where jobname = 'squire-reminders-every-minute'
   limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end
$$;

select cron.schedule(
  'squire-reminders-every-minute',
  '* * * * *',
  'select private.dispatch_squire_reminders();'
);
