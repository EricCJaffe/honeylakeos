-- Fix profiles primary key to be user_id (best practice for Supabase auth mapping)

-- Drop existing primary key constraint
do $$
declare
  pk_name text;
begin
  select constraint_name into pk_name
  from information_schema.table_constraints
  where table_schema='public' and table_name='profiles' and constraint_type='PRIMARY KEY';
  if pk_name is not null then
    execute format('alter table public.profiles drop constraint %I', pk_name);
  end if;
end $$;
-- Ensure user_id is not null
alter table public.profiles alter column user_id set not null;
-- Make user_id the primary key
alter table public.profiles add primary key (user_id);
-- Drop the redundant id column if it exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='id'
  ) then
    alter table public.profiles drop column id;
  end if;
end $$;
