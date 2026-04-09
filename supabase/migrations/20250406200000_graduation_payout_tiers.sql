-- 졸업 상금 스키마·RLS (cast_vote 재정의는 20250406200001)

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS first_vote_promo_claimed boolean NOT NULL DEFAULT false;

UPDATE public.users u
SET
  first_vote_promo_claimed = TRUE
WHERE
  EXISTS (
    SELECT
      1
    FROM
      public.votes v
    WHERE
      v.user_id = u.id
  );

ALTER TABLE public.payout_logs
ADD COLUMN IF NOT EXISTS vote_sequence integer;

ALTER TABLE public.payout_logs DROP CONSTRAINT IF EXISTS payout_logs_reason;

ALTER TABLE public.payout_logs ADD CONSTRAINT payout_logs_reason CHECK (
  reason IN (
    'GRADUATION_600_CREATOR',
    'GRADUATION_600_FIRST_VOTER',
    'GRADUATION_CREATOR',
    'GRADUATION_VOTER',
    'FIRST_GLOBAL_VOTE_PROMO'
  )
);

DROP POLICY IF EXISTS payout_logs_select_first_voter_public ON public.payout_logs;

CREATE POLICY payout_logs_select_first_voter_public ON public.payout_logs FOR SELECT
USING (
  reason = 'GRADUATION_600_FIRST_VOTER'
  OR (
    reason = 'GRADUATION_VOTER'
    AND vote_sequence = 1
  )
);
