ALTER TABLE public.ad_logs
DROP CONSTRAINT IF EXISTS ad_logs_type;

ALTER TABLE public.ad_logs
ADD CONSTRAINT ad_logs_type CHECK (
  ad_type IN (
    'ticket_recharge',
    'boost',
    'boost_charge_recharge',
    'hall_gate_interstitial',
    'upload_bonus',
    'share_viral'
  )
);
