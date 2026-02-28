-- Create RPC to get table columns for dev visibility
CREATE OR REPLACE FUNCTION public.get_table_columns()
RETURNS TABLE (
  table_name text,
  column_name text,
  data_type text,
  is_nullable text,
  ordinal_position integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.ordinal_position::integer
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name IN ('folders', 'notes', 'documents', 'entity_acl', 'memberships', 'profiles')
  ORDER BY c.table_name, c.ordinal_position;
$$;
-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_table_columns() TO authenticated;
