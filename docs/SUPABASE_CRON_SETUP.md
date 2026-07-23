# Agendador de notificações do Squire

O envio de lembretes é disparado pelo Supabase Cron. A Vercel apenas recebe a
chamada autenticada em `/api/cron/reminders`.

## 1. Aplicar a migração

Execute `supabase/migrations/202607230001_schedule_push_reminders.sql` no SQL
Editor do Supabase.

## 2. Cadastrar os segredos no Vault

No SQL Editor, substitua os dois valores entre `<...>`:

```sql
select vault.create_secret(
  '<URL_DE_PRODUCAO_SEM_BARRA_FINAL>',
  'squire_app_url',
  'URL de produção do Squire'
);

select vault.create_secret(
  '<MESMO_VALOR_DE_CRON_SECRET_DA_VERCEL>',
  'squire_cron_secret',
  'Token da rota de lembretes do Squire'
);
```

Esses valores ficam criptografados no Vault e não devem ser adicionados ao Git.

## 3. Testar

```sql
select private.dispatch_squire_reminders() as request_id;
```

A requisição é assíncrona. Aguarde alguns segundos e consulte:

```sql
select id, status_code, error_msg, created
from net._http_response
order by created desc
limit 10;
```

O resultado esperado é `status_code = 200`.

## 4. Monitorar

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'squire-reminders-every-minute';

select status, return_message, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 20;
```
