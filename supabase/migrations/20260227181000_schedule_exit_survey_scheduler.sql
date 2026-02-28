-- Schedules exit-survey-scheduler to run every 15 minutes via pg_cron.
-- Idempotent: existing job with same name is unscheduled first.
--
-- Run in production (SQL Editor) if local/remote migration histories are diverged.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema public;
do $$
declare
  v_job_name text := 'exit-survey-scheduler-every-15m';
  v_url text := 'https://umsibvxethuebdyjamxi.supabase.co/functions/v1/exit-survey-scheduler';
  v_headers jsonb := '{"Content-Type":"application/json"}'::jsonb;
  v_body jsonb := '{"mode":"all"}'::jsonb;
  v_http_fn text;
  v_command text;
  r record;
begin
  -- Unschedule any existing job(s) with the same name.
  for r in
    select jobid
    from cron.job
    where jobname = v_job_name
  loop
    perform cron.unschedule(r.jobid);
  end loop;

  -- pg_net function name differs across environments.
  if to_regproc('net.http_post') is not null then
    v_http_fn := 'net.http_post';
  elsif to_regproc('http_post') is not null then
    v_http_fn := 'http_post';
  else
    raise exception 'pg_net http_post function not found (expected net.http_post or public.http_post).';
  end if;

  v_command := format(
    'select %s(url:=%L, headers:=%L::jsonb, body:=%L::jsonb);',
    v_http_fn,
    v_url,
    v_headers::text,
    v_body::text
  );

  perform cron.schedule(v_job_name, '*/15 * * * *', v_command);
end
$$;
