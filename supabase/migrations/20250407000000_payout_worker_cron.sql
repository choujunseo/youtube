-- payout-worker 를 1분마다 자동 호출하는 pg_cron 잡.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 기존 동명 잡 제거 (재실행 안전)
SELECT cron.unschedule(jobid)
FROM   cron.job
WHERE  jobname = 'payout-worker-every-1min';

SELECT cron.schedule(
  'payout-worker-every-1min',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://doycnnibictugtnobebs.supabase.co/functions/v1/payout-worker',
    headers := '{"Content-Type":"application/json","x-payout-worker-secret":"REPLACE_WITH_PAYOUT_WORKER_SECRET"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
