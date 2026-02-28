-- Add address columns to profiles table (if not exist)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
-- Ensure other columns exist (they likely already do, but for safety)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
-- RLS policies already exist and are correct:
-- "Users can view their own profile" - SELECT where auth.uid() = user_id
-- "Users can update their own profile" - UPDATE where auth.uid() = user_id
-- No changes needed to RLS;
