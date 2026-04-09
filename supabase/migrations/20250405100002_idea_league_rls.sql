ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own ON public.users FOR SELECT USING (auth.uid() = id AND NOT is_deleted);

CREATE POLICY users_update_own ON public.users
FOR UPDATE
USING (auth.uid() = id AND NOT is_deleted)
WITH CHECK (auth.uid() = id AND NOT is_deleted);

CREATE POLICY ideas_select_public ON public.ideas FOR SELECT USING (true);

CREATE POLICY ideas_insert_own ON public.ideas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY ideas_update_own ON public.ideas
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY votes_select_own ON public.votes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY idea_impressions_all_own ON public.idea_impressions FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY reports_insert_any ON public.reports FOR INSERT
WITH CHECK (true);

CREATE POLICY ad_logs_select_own ON public.ad_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY ad_logs_insert_own ON public.ad_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_notifications_select_own ON public.user_notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_notifications_update_own ON public.user_notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
