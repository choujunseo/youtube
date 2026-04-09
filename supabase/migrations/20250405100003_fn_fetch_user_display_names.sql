CREATE OR REPLACE FUNCTION public.fetch_user_display_names (p_user_ids uuid[])
RETURNS TABLE (
  id uuid,
  display_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.display_name
  FROM
    public.users u
  WHERE
    u.id = ANY (p_user_ids)
    AND NOT u.is_deleted;
$$;
