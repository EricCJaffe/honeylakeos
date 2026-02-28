create or replace function public.promote_self_to_super_admin()
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
  v_has_memberships boolean;
  v_super_admin_exists boolean;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- ensure profile exists
  insert into public.profiles (user_id, email, full_name)
  values (v_user_id, nullif(v_email,''), nullif(v_email,''))
  on conflict (user_id) do nothing;

  -- pick an existing site (first one)
  select id into v_site_id
  from public.sites
  order by created_at nulls last, id
  limit 1;

  if v_site_id is null then
    raise exception 'No sites found (unexpected)';
  end if;

  -- check if site_memberships exists
  select exists (
    select 1
    from information_schema.tables
    where table_schema='public' and table_name='site_memberships'
  ) into v_has_site_memberships;

  if v_has_site_memberships then
    -- allow promotion ONLY if no super_admin exists yet (prevents abuse later)
    execute
      'select exists (
         select 1 from public.site_memberships
         where role = ''super_admin''
       )'
    into v_super_admin_exists;

    if v_super_admin_exists then
      raise exception 'A super_admin already exists; promotion blocked';
    end if;

    execute format(
      'insert into public.site_memberships (site_id, user_id, role)
       values (%L, %L, %L)
       on conflict do nothing',
      v_site_id, v_user_id, 'super_admin'
    );
  end if;

  -- pick a company in this site if possible and make sure you have a membership + active company
  select id into v_company_id
  from public.companies
  where site_id = v_site_id
  order by created_at nulls last, id
  limit 1;

  -- if memberships table exists, ensure you are company_admin for that company (if we found one)
  select exists (
    select 1
    from information_schema.tables
    where table_schema='public' and table_name='memberships'
  ) into v_has_memberships;

  if v_has_memberships and v_company_id is not null then
    insert into public.memberships (company_id, user_id, role, status)
    values (v_company_id, v_user_id, 'company_admin', 'active')
    on conflict do nothing;

    update public.profiles
    set active_company_id = v_company_id
    where user_id = v_user_id;
  end if;

  return json_build_object(
    'ok', true,
    'user_id', v_user_id,
    'email', v_email,
    'site_id', v_site_id,
    'company_id', v_company_id,
    'promoted_via_site_memberships', v_has_site_memberships
  );
end;
$$;
grant execute on function public.promote_self_to_super_admin() to authenticated;
