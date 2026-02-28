UPDATE public.exit_survey_questions q
SET owner_name = concat_ws(
  ' ',
  CASE
    WHEN lower(trim(e.title)) = 'dr' THEN 'Dr.'
    ELSE trim(e.title)
  END,
  e.full_name
)
FROM public.employees e
WHERE q.company_id = e.company_id
  AND q.owner_email IS NOT NULL
  AND e.email IS NOT NULL
  AND lower(q.owner_email) = lower(e.email)
  AND coalesce(trim(e.title), '') <> ''
  AND q.owner_name IS DISTINCT FROM concat_ws(
    ' ',
    CASE
      WHEN lower(trim(e.title)) = 'dr' THEN 'Dr.'
      ELSE trim(e.title)
    END,
    e.full_name
  );
