-- 공유 코드(UUID 앞 8자리 hex) 로 아이디어를 찾는 함수.
-- PostgREST는 컬럼명에서 ::text 캐스팅을 지원하지 않으므로 함수로 처리한다.
CREATE OR REPLACE FUNCTION public.fetch_idea_by_code(p_code text)
RETURNS SETOF public.ideas
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT *
  FROM   public.ideas
  WHERE  id::text ILIKE (lower(p_code) || '%')
  LIMIT  1;
$$;

GRANT EXECUTE ON FUNCTION public.fetch_idea_by_code(text) TO anon, authenticated, service_role;
