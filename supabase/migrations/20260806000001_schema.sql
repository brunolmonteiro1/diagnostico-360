-- Diagnóstico 360 — schema base (Fase 1)
--
-- As tabelas e colunas seguem o modelo de dados do CLAUDE.md. Nada foi
-- acrescentado ao modelo; o que existe aqui além dele são tipos, defaults,
-- chaves estrangeiras e índices — a materialização do modelo em Postgres.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type rodada_status as enum ('rascunho', 'aberta', 'encerrada', 'arquivada');

create type respondente_vinculo as enum (
  'socio', 'gestor', 'colaborador', 'terceirizado', 'estagiario', 'franqueadora'
);

create type respondente_status as enum ('em_andamento', 'concluido');

create type pergunta_bloco as enum (
  'identificacao', 'universal', 'area', 'lideranca', 'encerramento'
);

create type pergunta_tipo as enum (
  'likert5', 'frequencia5', 'escala0a10', 'unica', 'multipla',
  'texto_curto', 'texto_longo', 'numero'
);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  email text,
  role text not null default 'consultor',
  created_at timestamptz not null default now()
);

comment on table profiles is
  'Perfil do consultor. O id é o mesmo de auth.users.';

-- Cria o profile automaticamente quando o Auth cria o usuário; sem isso o
-- consultor autentica mas não tem linha para as políticas referenciarem.
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', new.raw_user_meta_data ->> 'name'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- clientes
-- ---------------------------------------------------------------------------

create table clientes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  nome_fantasia text not null,
  razao_social text,
  cnpj text,
  segmento text,
  porte text,
  n_colaboradores integer,
  logo_url text,
  observacoes text,
  created_at timestamptz not null default now()
);

create index clientes_owner_id_idx on clientes (owner_id);

comment on column clientes.owner_id is
  'Raiz da cadeia de propriedade: toda política de RLS do sistema desce até aqui.';

-- ---------------------------------------------------------------------------
-- rodadas
-- ---------------------------------------------------------------------------

create table rodadas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  titulo text not null,
  status rodada_status not null default 'rascunho',
  anonima boolean not null default false,
  modulos_ativos text[] not null default '{}',
  abertura_em timestamptz,
  prazo_em timestamptz,
  mensagem_abertura text,
  created_at timestamptz not null default now()
);

create index rodadas_cliente_id_idx on rodadas (cliente_id);

-- ---------------------------------------------------------------------------
-- convites
-- ---------------------------------------------------------------------------

create table convites (
  id uuid primary key default gen_random_uuid(),
  rodada_id uuid not null references rodadas (id) on delete cascade,
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  email text,
  nome_sugerido text,
  enviado_em timestamptz,
  aberto_em timestamptz,
  lembretes_enviados integer not null default 0,
  created_at timestamptz not null default now()
);

create index convites_rodada_id_idx on convites (rodada_id);

comment on column convites.token is
  'O token É a credencial do respondente. Só edge function com service role o valida.';

-- ---------------------------------------------------------------------------
-- respondentes
-- ---------------------------------------------------------------------------

create table respondentes (
  id uuid primary key default gen_random_uuid(),
  rodada_id uuid not null references rodadas (id) on delete cascade,
  convite_id uuid references convites (id) on delete set null,
  nome text,
  email text,
  cargo text,
  area_principal text,
  areas_secundarias text[] not null default '{}',
  vinculo respondente_vinculo,
  tempo_empresa text,
  reporta_para text,
  n_liderados integer,
  consentimento_lgpd boolean not null default false,
  status respondente_status not null default 'em_andamento',
  iniciado_em timestamptz,
  concluido_em timestamptz,
  duracao_segundos integer,
  autoavaliacao_confianca integer
);

create index respondentes_rodada_id_idx on respondentes (rodada_id);
create index respondentes_convite_id_idx on respondentes (convite_id);

-- ---------------------------------------------------------------------------
-- perguntas
-- ---------------------------------------------------------------------------

create table perguntas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  bloco pergunta_bloco not null,
  dimensao text,
  area_scope text[] not null default '{}',
  vinculo_scope text[] not null default '{}',
  ordem integer not null default 0,
  enunciado text not null,
  ajuda text,
  tipo pergunta_tipo not null,
  opcoes jsonb,
  permite_nao_sei boolean not null default true,
  invertida boolean not null default false,
  peso numeric not null default 1,
  obrigatoria boolean not null default false,
  ativa boolean not null default true
);

create index perguntas_bloco_ordem_idx on perguntas (bloco, ordem);

comment on column perguntas.area_scope is
  'Escopo vazio significa "todos": ''{}'' aparece para todas as áreas.';

comment on column perguntas.permite_nao_sei is
  'Princípio central do produto: toda pergunta objetiva oferece "Não sei". Default true.';

-- ---------------------------------------------------------------------------
-- respostas
-- ---------------------------------------------------------------------------

create table respostas (
  id uuid primary key default gen_random_uuid(),
  respondente_id uuid not null references respondentes (id) on delete cascade,
  pergunta_id uuid not null references perguntas (id) on delete cascade,
  nao_sei boolean not null default false,
  valor_num numeric,
  valor_texto text,
  valor_opcoes text[],
  respondido_em timestamptz not null default now(),
  unique (respondente_id, pergunta_id)
);

create index respostas_respondente_id_idx on respostas (respondente_id);
create index respostas_pergunta_id_idx on respostas (pergunta_id);

-- A regra que sustenta o produto, no nível mais baixo possível: um "não sei"
-- não pode carregar valor nenhum junto. Não dá para ter as duas coisas.
alter table respostas add constraint chk_nao_sei
  check (not nao_sei or (valor_num is null and valor_texto is null
         and valor_opcoes is null));

-- ---------------------------------------------------------------------------
-- relatorios
-- ---------------------------------------------------------------------------

create table relatorios (
  id uuid primary key default gen_random_uuid(),
  rodada_id uuid not null references rodadas (id) on delete cascade,
  versao integer not null default 1,
  scores jsonb,
  narrativa jsonb,
  editado_manualmente boolean not null default false,
  narrativa_editada jsonb,
  gerado_em timestamptz not null default now(),
  gerado_por uuid references profiles (id) on delete set null
);

create index relatorios_rodada_id_idx on relatorios (rodada_id);
