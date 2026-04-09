REVOKE ALL ON FUNCTION public.complete_user_withdraw (uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.complete_user_withdraw (uuid) TO service_role;
