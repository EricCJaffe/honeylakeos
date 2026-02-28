-- Create a secure RPC for company member directory
-- Only accessible by company admins for that specific company
CREATE OR REPLACE FUNCTION public.get_company_member_directory(p_company_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    p.email
  FROM public.memberships m
  INNER JOIN public.profiles p ON p.user_id = m.user_id
  WHERE m.company_id = p_company_id
    AND m.status = 'active'
    AND (m.expires_at IS NULL OR m.expires_at > now())
    -- Only allow company admins to access this
    AND is_company_admin(p_company_id);
$$;
-- Grant execute to authenticated users (the function itself checks admin status)
GRANT EXECUTE ON FUNCTION public.get_company_member_directory(uuid) TO authenticated;
-- Also create a function to get profile info for ACL display (for entity owners/admins)
CREATE OR REPLACE FUNCTION public.get_acl_grantee_profile(p_grantee_id uuid, p_entity_type text, p_entity_id uuid)
RETURNS TABLE (
  full_name text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.full_name,
    p.email
  FROM public.profiles p
  WHERE p.user_id = p_grantee_id
    -- Only allow if caller is admin or owner of the entity
    AND (
      is_company_admin(entity_acl_company_id(p_entity_type, p_entity_id))
      OR entity_acl_is_owner(p_entity_type, p_entity_id)
      OR p_grantee_id = auth.uid()
    );
$$;
GRANT EXECUTE ON FUNCTION public.get_acl_grantee_profile(uuid, text, uuid) TO authenticated;
