-- Bootstrap function: runs as definer and can bypass RLS (common Supabase pattern)
create or replace function public.bootstrap_first_site(
  p_site_name text default 'BibleOS',
  p_company_name text default 'First Company'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', '');
  v_site_id uuid;
  v_company_id uuid;
  v_has_site_memberships boolean;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Allow ONLY if there are zero sites (first-run bootstrap)
  if (select count(*) from public.sites) > 0 then
    raise exception 'Bootstrap disabled: sites already exist';
  end if;

  -- Ensure profile exists
  insert into public.profiles (user_id, email, full_name)
  values (v_user_id, nullif(v_email,''), nullif(v_email,''))
  on conflict (user_id) do nothing;

  -- Create site
  insert into public.sites (name)
  values (p_site_name)
  returning id into v_site_id;

  -- Create company under site
  insert into public.companies (site_id, name)
  values (v_site_id, p_company_name)
  returning id into v_company_id;

  -- Create membership
  insert into public.memberships (company_id, user_id, role, status)
  values (v_company_id, v_user_id, 'company_admin', 'active')
  on conflict do nothing;

  -- Optionally create site_memberships if that table exists
  select exists (
    select 1
    from information_schema.tables
    where table_schema='public' and table_name='site_memberships'
  ) into v_has_site_memberships;

  if v_has_site_memberships then
    execute format(
      'insert into public.site_memberships (site_id, user_id, role)
       values (%L, %L, %L)
       on conflict do nothing',
      v_site_id, v_user_id, 'super_admin'
    );
  end if;

  -- Set active company
  update public.profiles
  set active_company_id = v_company_id
  where user_id = v_user_id;

  return json_build_object(
    'ok', true,
    'user_id', v_user_id,
    'site_id', v_site_id,
    'company_id', v_company_id,
    'email', v_email
  );
end;
$$;

-- Let authenticated users call it
grant execute on function public.bootstrap_first_site(text, text) to authenticated;