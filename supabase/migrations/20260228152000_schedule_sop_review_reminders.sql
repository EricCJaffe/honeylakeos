-- Schedule SOP review reminders (daily) via pg_cron + pg_net.
-- This migration is idempotent and can be re-run safely.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'sop-review-reminders-daily';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'sop-review-reminders-daily',
    '0 14 * * *',
    $job$
    select net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sop-review-reminders',
      headers := jsonb_strip_nulls(
        jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'x-scheduler-secret', nullif(current_setting('app.settings.sop_review_scheduler_secret', true), '')
        )
      ),
      body := '{"dry_run":false}'::jsonb
    );
    $job$
  );
end;
$$;
