REVOKE EXECUTE ON FUNCTION public.protect_plan_type() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_admin_by_email() FROM PUBLIC, anon, authenticated;