-- Helpers only (no PL/pgSQL bodies with many internal semicolons in one migration batch)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.kst_today_key()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT to_char((timezone('Asia/Seoul', now()))::date, 'YYYY-MM-DD');
$$;

CREATE OR REPLACE FUNCTION public.current_week_id_kst()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT
    to_char((timezone('Asia/Seoul', now()))::date, 'IYYY')
    || '-W'
    || lpad(
      to_char((timezone('Asia/Seoul', now()))::date, 'IW'),
      2,
      '0'
    );
$$;

CREATE OR REPLACE FUNCTION public.vote_weight_kst()
RETURNS smallint
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN extract(
      dow
      FROM
        timezone('Asia/Seoul', now())
    )::int = 0 THEN 2::smallint
    ELSE 1::smallint
  END;
$$;
