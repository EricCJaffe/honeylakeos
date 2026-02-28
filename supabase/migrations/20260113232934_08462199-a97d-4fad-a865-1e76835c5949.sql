-- ============================================================
-- BusinessOS — Foundation + Multi-Tenant RLS
-- ============================================================

-- Enable extensions
create extension if not exists "pgcrypto";
-- ============================================================
-- ENUMS
-- ============================================================

do $$ begin
  create type membership_role as enum (
    'company_admin',
    'location_admin',
    'module_admin',
    'user',
    'external'
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create type site_role as enum (
    'super_admin',
    'site_admin'
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create type company_status as enum (
    'active',
    'inactive',
    'archived',
    'pending',
    'suspended'
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create type module_status as enum (
    'active',
    'trial',
    'expired',
    'suspended'
  );
exception when duplicate_object then null; end $$;
-- ============================================================
-- ADD NEW COLUMNS TO EXISTING PROFILES TABLE
-- ============================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active_company_id uuid null,
ADD COLUMN IF NOT EXISTS active_location_id uuid null,
ADD COLUMN IF NOT EXISTS full_name text;
-- ============================================================
-- TOUCH UPDATED_AT FUNCTION
-- ============================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
-- ============================================================
-- SITES (Single SaaS Instance)
-- ============================================================

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
alter table public.sites enable row level security;
-- ============================================================
-- COMPANIES
-- ============================================================

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  status company_status not null default 'pending',
  primary_color text,
  logo_url text,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);
create index if not exists idx_companies_site_id on public.companies(site_id);
alter table public.companies enable row level security;
-- ============================================================
-- LOCATIONS
-- ============================================================

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  type text default 'branch',
  status text default 'active',
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  timezone text,
  created_at timestamptz not null default now()
);
create index if not exists idx_locations_company_id on public.locations(company_id);
alter table public.locations enable row level security;
-- ============================================================
-- SITE MEMBERSHIPS (Platform Admins)
-- ============================================================

create table if not exists public.site_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  role site_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, site_id, role)
);
create index if not exists idx_site_memberships_user_id on public.site_memberships(user_id);
alter table public.site_memberships enable row level security;
-- ============================================================
-- COMPANY MEMBERSHIPS (Multi-Company + External Users)
-- ============================================================

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role membership_role not null default 'user',
  member_type text not null default 'internal',
  status text not null default 'active',
  default_location_id uuid null references public.locations(id),
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  unique(user_id, company_id)
);
create index if not exists idx_memberships_user_company on public.memberships(user_id, company_id);
create index if not exists idx_memberships_company on public.memberships(company_id);
alter table public.memberships enable row level security;
-- ============================================================
-- MODULES + COMPANY MODULE ENABLEMENT
-- ============================================================

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  category text default 'core',
  version text default '1.0.0',
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.modules enable row level security;
create table if not exists public.company_modules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  status module_status not null default 'active',
  configuration jsonb not null default '{}'::jsonb,
  granted_by uuid null references auth.users(id),
  granted_at timestamptz not null default now(),
  expires_at timestamptz null,
  unique(company_id, module_id)
);
create index if not exists idx_company_modules_company on public.company_modules(company_id);
alter table public.company_modules enable row level security;
-- ============================================================
-- ADD FOREIGN KEYS TO PROFILES (after tables exist)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_active_company_id_fkey'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_active_company_id_fkey 
    FOREIGN KEY (active_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_active_location_id_fkey'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_active_location_id_fkey 
    FOREIGN KEY (active_location_id) REFERENCES public.locations(id) ON DELETE SET NULL;
  END IF;
END $$;
-- ============================================================
-- HELPER FUNCTIONS FOR RLS (SECURITY DEFINER)
-- ============================================================

create or replace function public.is_site_admin(p_site_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.site_memberships sm
    where sm.user_id = auth.uid()
      and sm.site_id = p_site_id
      and sm.role in ('super_admin','site_admin')
  );
$$;
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.site_memberships sm
    where sm.user_id = auth.uid()
      and sm.role = 'super_admin'
  );
$$;
create or replace function public.is_company_member(p_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.company_id = p_company_id
      and m.status = 'active'
      and (m.expires_at is null or m.expires_at > now())
  );
$$;
create or replace function public.is_company_admin(p_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.company_id = p_company_id
      and m.status = 'active'
      and m.role = 'company_admin'
      and (m.expires_at is null or m.expires_at > now())
  );
$$;
-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- SITES
create policy "sites_select_admin"
  on public.sites for select
  using (public.is_site_admin(id));
-- COMPANIES
create policy "companies_select_member_or_site_admin"
  on public.companies for select
  using (
    public.is_company_member(id)
    OR public.is_site_admin(site_id)
  );
create policy "companies_insert_site_admin"
  on public.companies for insert
  with check (public.is_site_admin(site_id));
create policy "companies_update_admins"
  on public.companies for update
  using (
    public.is_site_admin(site_id)
    OR public.is_company_admin(id)
  );
-- LOCATIONS
create policy "locations_select_member_or_site_admin"
  on public.locations for select
  using (
    public.is_company_member(company_id)
    OR public.is_site_admin(
      (select c.site_id from public.companies c where c.id = locations.company_id)
    )
  );
create policy "locations_write_admins"
  on public.locations for insert
  with check (
    public.is_company_admin(company_id)
    OR public.is_site_admin(
      (select c.site_id from public.companies c where c.id = locations.company_id)
    )
  );
-- MEMBERSHIPS
create policy "memberships_select_own_or_admin"
  on public.memberships for select
  using (
    user_id = auth.uid()
    OR public.is_company_admin(company_id)
    OR public.is_site_admin(
      (select c.site_id from public.companies c where c.id = memberships.company_id)
    )
  );
create policy "memberships_insert_admins"
  on public.memberships for insert
  with check (
    public.is_company_admin(company_id)
    OR public.is_site_admin(
      (select c.site_id from public.companies c where c.id = memberships.company_id)
    )
  );
create policy "memberships_update_admins"
  on public.memberships for update
  using (
    public.is_company_admin(company_id)
    OR public.is_site_admin(
      (select c.site_id from public.companies c where c.id = memberships.company_id)
    )
  );
-- SITE MEMBERSHIPS
create policy "site_memberships_select_admin"
  on public.site_memberships for select
  using (public.is_site_admin(site_id));
create policy "site_memberships_write_super_admin"
  on public.site_memberships for insert
  with check (public.is_super_admin());
-- MODULES
create policy "modules_select_authenticated"
  on public.modules for select
  using (auth.uid() is not null);
create policy "modules_write_super_admin"
  on public.modules for insert
  with check (public.is_super_admin());
-- COMPANY MODULES
create policy "company_modules_select_member_or_site_admin"
  on public.company_modules for select
  using (
    public.is_company_member(company_id)
    OR public.is_site_admin(
      (select c.site_id from public.companies c where c.id = company_modules.company_id)
    )
  );
create policy "company_modules_write_admins"
  on public.company_modules for insert
  with check (
    public.is_company_admin(company_id)
    OR public.is_site_admin(
      (select c.site_id from public.companies c where c.id = company_modules.company_id)
    )
  );
-- ============================================================
-- SEED BUSINESSOS SITE
-- ============================================================

insert into public.sites (name, subdomain)
select 'BusinessOS', 'businessos'
where not exists (select 1 from public.sites);
