-- Create function to get default site ID safely (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_default_site_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id 
  FROM public.sites 
  WHERE status = 'active' 
  ORDER BY created_at ASC 
  LIMIT 1;
$$;
-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_default_site_id() TO authenticated;
