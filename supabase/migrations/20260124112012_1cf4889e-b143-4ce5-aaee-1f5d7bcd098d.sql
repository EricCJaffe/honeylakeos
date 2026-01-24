-- Add missing modules that exist in moduleRegistry but not in the modules table

-- Workflows module (separate from Forms)
INSERT INTO public.modules (name, slug, description, category, is_public, version)
VALUES ('Workflows', 'workflows', 'Process automation and workflow management', 'automation', true, '1.0.0')
ON CONFLICT (slug) DO NOTHING;

-- Announcements module
INSERT INTO public.modules (name, slug, description, category, is_public, version)
VALUES ('Announcements', 'announcements', 'Company-wide announcements and communications', 'core', true, '1.0.0')
ON CONFLICT (slug) DO NOTHING;

-- Coaching module (for coaching org hierarchy)
INSERT INTO public.modules (name, slug, description, category, is_public, version)
VALUES ('Coaching', 'coaching', 'Coaching organization and client engagement', 'premium', true, '1.0.0')
ON CONFLICT (slug) DO NOTHING;

-- Contacts module
INSERT INTO public.modules (name, slug, description, category, is_public, version)
VALUES ('Contacts', 'contacts', 'External contact management', 'core', true, '1.0.0')
ON CONFLICT (slug) DO NOTHING;