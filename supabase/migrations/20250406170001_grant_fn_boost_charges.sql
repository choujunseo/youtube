GRANT EXECUTE ON FUNCTION public.reward_boost_recharge (uuid, text, integer) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.apply_boost_charge_on_idea (uuid) TO authenticated, service_role;
