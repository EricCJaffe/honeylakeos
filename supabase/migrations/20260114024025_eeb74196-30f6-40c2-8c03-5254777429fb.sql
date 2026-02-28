-- Add UPDATE policy for modules - super admin only
CREATE POLICY "modules_update_super_admin"
ON public.modules FOR UPDATE
USING (is_super_admin());
-- Add DELETE policy for modules - super admin only
CREATE POLICY "modules_delete_super_admin"
ON public.modules FOR DELETE
USING (is_super_admin());
