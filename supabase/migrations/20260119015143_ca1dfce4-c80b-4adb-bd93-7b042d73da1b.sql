-- Add RLS policies for integration_secrets (RLS already enabled)
DO $$
BEGIN
  -- Drop existing policies if any (safe for reruns)
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='integration_secrets' AND policyname='Admins can read integration secrets'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can read integration secrets" ON public.integration_secrets';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='integration_secrets' AND policyname='Admins can create integration secrets'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can create integration secrets" ON public.integration_secrets';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='integration_secrets' AND policyname='Admins can update integration secrets'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can update integration secrets" ON public.integration_secrets';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='integration_secrets' AND policyname='Admins can delete integration secrets'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can delete integration secrets" ON public.integration_secrets';
  END IF;
END $$;

CREATE POLICY "Admins can read integration secrets"
ON public.integration_secrets
FOR SELECT
USING (
  is_super_admin()
  OR (
    scope = 'company' AND is_company_admin(scope_id)
  )
);

CREATE POLICY "Admins can create integration secrets"
ON public.integration_secrets
FOR INSERT
WITH CHECK (
  is_super_admin()
  OR (
    scope = 'company' AND is_company_admin(scope_id)
  )
);

CREATE POLICY "Admins can update integration secrets"
ON public.integration_secrets
FOR UPDATE
USING (
  is_super_admin()
  OR (
    scope = 'company' AND is_company_admin(scope_id)
  )
)
WITH CHECK (
  is_super_admin()
  OR (
    scope = 'company' AND is_company_admin(scope_id)
  )
);

CREATE POLICY "Admins can delete integration secrets"
ON public.integration_secrets
FOR DELETE
USING (
  is_super_admin()
  OR (
    scope = 'company' AND is_company_admin(scope_id)
  )
);
