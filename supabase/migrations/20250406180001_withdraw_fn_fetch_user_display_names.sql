CREATE OR REPLACE FUNCTION public.fetch_user_display_names (p_user_ids uuid[])
RETURNS TABLE (
  id uuid,
  display_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $body$
  SELECT
    uid AS id,
    CASE
      WHEN u.id IS NULL THEN '알 수 없음'
      WHEN u.is_deleted THEN '알 수 없음'
      WHEN nullif(trim(u.display_name), '') IS NULL THEN '알 수 없음'
      ELSE trim(u.display_name)
    END AS display_name
  FROM
    unnest(p_user_ids) AS uid
    LEFT JOIN public.users u ON u.id = uid;
$body$;
