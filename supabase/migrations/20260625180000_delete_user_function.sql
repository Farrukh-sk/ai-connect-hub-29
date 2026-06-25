-- Allows an authenticated user to delete their own account.
-- SECURITY DEFINER runs as the function owner (postgres) so it has
-- permission to delete from auth.users.
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;
