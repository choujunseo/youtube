-- FIRST_GLOBAL_VOTE_PROMO: 유저당 1회만 지급되어야 함.
-- cast_vote_atomic 의 first_vote_promo_claimed 플래그로 1차 방지하지만,
-- DB 레벨 최후 안전망을 추가한다.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_payout_first_vote_promo_per_user
  ON public.payout_logs (user_id)
  WHERE reason = 'FIRST_GLOBAL_VOTE_PROMO';
