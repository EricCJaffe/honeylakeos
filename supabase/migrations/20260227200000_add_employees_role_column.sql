-- Store organizational role/title metadata imported from HR mapping sheets.
-- This is intentionally separate from memberships.role (access permissions).
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS role text;
