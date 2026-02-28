
ALTER TABLE kb_articles
  ADD COLUMN IF NOT EXISTS visible_to_modules TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visible_to_roles    TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN kb_articles.visible_to_modules IS
  'Empty = visible to all companies. Non-empty = only show when company has at least one listed module active.';
COMMENT ON COLUMN kb_articles.visible_to_roles IS
  'Empty = visible to all roles. Non-empty = only show to users with at least one listed role (company_admin, site_admin).';
;
