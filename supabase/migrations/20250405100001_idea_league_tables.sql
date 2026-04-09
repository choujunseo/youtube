CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  toss_user_key bigint NOT NULL,
  display_name text NOT NULL DEFAULT '',
  free_tickets integer NOT NULL DEFAULT 10,
  ad_tickets integer NOT NULL DEFAULT 0,
  weekly_upload_count integer NOT NULL DEFAULT 0,
  has_bonus_upload boolean NOT NULL DEFAULT false,
  ticket_reset_at timestamptz,
  upload_count_reset_at date,
  welcome_ticket_claimed boolean NOT NULL DEFAULT false,
  last_daily_ticket_kst text,
  last_share_reward_kst text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_toss_user_key_key UNIQUE (toss_user_key)
);

CREATE INDEX idx_users_toss_user_key ON public.users (toss_user_key);

CREATE TABLE public.ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  thumbnail_url text,
  category text NOT NULL DEFAULT 'etc',
  category_tags text[] NOT NULL DEFAULT '{}',
  total_vote_count integer NOT NULL DEFAULT 0,
  weighted_share numeric NOT NULL DEFAULT 0,
  is_boosted boolean NOT NULL DEFAULT false,
  boost_expires_at timestamptz,
  week_id text NOT NULL DEFAULT (public.current_week_id_kst ()),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ideas_title_len CHECK (char_length(title) <= 50),
  CONSTRAINT ideas_desc_len CHECK (char_length(description) <= 100)
);

CREATE INDEX idx_ideas_week_votes ON public.ideas (week_id, total_vote_count);
CREATE INDEX idx_ideas_user ON public.ideas (user_id);
CREATE INDEX idx_ideas_created ON public.ideas (created_at DESC);

CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  idea_id uuid NOT NULL REFERENCES public.ideas (id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL,
  weight smallint NOT NULL,
  weighted_share numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT votes_user_idea UNIQUE (user_id, idea_id),
  CONSTRAINT votes_weight CHECK (weight >= 1 AND weight <= 3)
);

CREATE INDEX idx_votes_user ON public.votes (user_id);
CREATE INDEX idx_votes_idea ON public.votes (idea_id);

CREATE TABLE public.idea_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  idea_id uuid NOT NULL REFERENCES public.ideas (id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT idea_impressions_user_idea UNIQUE (user_id, idea_id)
);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  reporter_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  reported_idea_id uuid NOT NULL REFERENCES public.ideas (id) ON DELETE CASCADE,
  reason_code text NOT NULL DEFAULT 'OTHER',
  reason_detail text,
  status text NOT NULL DEFAULT 'pending',
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_idea ON public.reports (reported_idea_id);

CREATE TABLE public.ad_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  ad_type text NOT NULL,
  ad_group_id text NOT NULL DEFAULT '',
  reward_amount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ad_logs_type CHECK (
    ad_type IN (
      'ticket_recharge',
      'boost',
      'upload_bonus',
      'share_viral'
    )
  )
);

CREATE INDEX idx_ad_logs_user ON public.ad_logs (user_id, created_at DESC);

CREATE TABLE public.payout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  idea_id uuid NOT NULL REFERENCES public.ideas (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  amount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT payout_logs_reason CHECK (
    reason IN (
      'GRADUATION_600_CREATOR',
      'GRADUATION_600_FIRST_VOTER'
    )
  ),
  CONSTRAINT payout_logs_status CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  )
);

CREATE INDEX idx_payout_logs_idea_reason ON public.payout_logs (idea_id, reason);

CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  payout_log_id uuid REFERENCES public.payout_logs (id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_notifications_user ON public.user_notifications (user_id, created_at DESC);
