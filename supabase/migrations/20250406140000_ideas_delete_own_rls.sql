-- 본인이 작성한 아이디어만 삭제 가능 (연관 votes·impressions 등은 FK CASCADE)
GRANT DELETE ON public.ideas TO authenticated;

CREATE POLICY ideas_delete_own ON public.ideas FOR DELETE USING (auth.uid() = user_id);
