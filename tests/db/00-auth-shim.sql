-- SOMENTE PARA TESTE. Não é migration e nunca roda em produção.
--
-- Reproduz o mínimo que o Supabase já fornece — roles da API, schema `auth`,
-- `auth.users` e `auth.uid()` — para que as migrations reais possam ser
-- aplicadas contra um Postgres comum e as políticas de RLS sejam exercitadas
-- do mesmo jeito que seriam em produção.
--
-- Se algo aqui divergir do Supabase, o teste passa a mentir. Manter enxuto.

create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  -- No Supabase o service_role tem BYPASSRLS: é o que permite às edge
  -- functions gravarem a resposta de quem não tem login.
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Mesma implementação do Supabase: lê o `sub` das claims do JWT que o
-- PostgREST injeta na sessão.
create or replace function auth.uid()
returns uuid
language sql
stable
-- O nullif vem ANTES do cast para jsonb, como no Supabase: sem sessão a GUC é
-- string vazia, e ''::jsonb é erro de sintaxe — não "usuário nenhum".
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  )::text;
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;
