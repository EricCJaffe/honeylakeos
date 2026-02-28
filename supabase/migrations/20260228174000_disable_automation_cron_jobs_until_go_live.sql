-- Disable automation cron jobs until go-live.
-- This keeps all automated jobs manual/test-only by default.

create extension if not exists pg_cron;

do $$
declare
  job_record record;
begin
  for job_record in
    select jobid
    from cron.job
    where jobname in (
      'sop-review-reminders-daily',
      'exit-survey-scheduler-every-15m',
      'exit-survey-weekly-digest',
      'exit-survey-reminders'
    )
      or jobname like 'exit-survey-%'
      or jobname like 'sop-review-reminders-%'
  loop
    perform cron.unschedule(job_record.jobid);
  end loop;
end;
$$;
