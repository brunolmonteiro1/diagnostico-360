-- Diagnóstico 360 — Row Level Security (Fase 1)
--
-- Regra do CLAUDE.md: cada consultor só enxerga registros que descendem de um
-- cliente com owner_id = auth.uid().
--
-- O isolamento é do BANCO, não do frontend. Vale igualmente para o app, para um
-- script e para quem tiver a anon key na mão.
--
-- O respondente não é contemplado por política nenhuma aqui: ele não faz login e
-- todo acesso dele passa por edge function com service role, que valida o token.
-- Por isso as tabelas de resposta não recebem grant de escrita para `authenticated`.

-- ---------------------------------------------------------------------------
-- Helpers de propriedade
--
-- security definer para que a checagem de propriedade não fique sujeita à RLS
-- da própria tabela consultada (evita recursão de política e mantém as policies
-- legíveis). Cada uma responde apenas um booleano sobre propriedade.
-- ---------------------------------------------------------------------------

create function owns_cliente(p_cliente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from clientes c
    where c.id = p_cliente_id
      and c.owner_id = (select auth.uid())
  );
$$;

create function owns_rodada(p_rodada_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from rodadas r
    join clientes c on c.id = r.cliente_id
    where r.id = p_rodada_id
      and c.owner_id = (select auth.uid())
  );
$$;

create function owns_respondente(p_respondente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from respondentes re
    join rodadas r on r.id = re.rodada_id
    join clientes c on c.id = r.cliente_id
    where re.id = p_respondente_id
      and c.owner_id = (select auth.uid())
  );
$$;

revoke all on function owns_cliente(uuid) from public;
revoke all on function owns_rodada(uuid) from public;
revoke all on function owns_respondente(uuid) from public;
grant execute on function owns_cliente(uuid) to authenticated;
grant execute on function owns_rodada(uuid) to authenticated;
grant execute on function owns_respondente(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS ligada em tudo. Sem política, o default é negar.
-- ---------------------------------------------------------------------------

alter table profiles      enable row level security;
alter table clientes      enable row level security;
alter table rodadas       enable row level security;
alter table convites      enable row level security;
alter table respondentes  enable row level security;
alter table perguntas     enable row level security;
alter table respostas     enable row level security;
alter table relatorios    enable row level security;

-- ---------------------------------------------------------------------------
-- Privilégios de tabela
--
-- RLS filtra linhas; GRANT decide se a operação é possível. As duas camadas
-- precisam concordar. `anon` não recebe nada: o fluxo público não usa o client.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;

grant select, update                 on profiles     to authenticated;
grant select, insert, update, delete on clientes     to authenticated;
grant select, insert, update, delete on rodadas      to authenticated;
grant select, insert, update, delete on convites     to authenticated;
grant select                         on respondentes to authenticated;
grant select                         on perguntas    to authenticated;
grant select                         on respostas    to authenticated;
grant select, update                 on relatorios   to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy profiles_select_own on profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- clientes — a raiz da cadeia
--
-- O `with check` importa tanto quanto o `using`: sem ele, um consultor poderia
-- inserir ou reatribuir um cliente com owner_id de outra pessoa.
-- ---------------------------------------------------------------------------

create policy clientes_select_own on clientes
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy clientes_insert_own on clientes
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy clientes_update_own on clientes
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy clientes_delete_own on clientes
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- rodadas
-- ---------------------------------------------------------------------------

create policy rodadas_select_own on rodadas
  for select to authenticated
  using (owns_cliente(cliente_id));

create policy rodadas_insert_own on rodadas
  for insert to authenticated
  with check (owns_cliente(cliente_id));

create policy rodadas_update_own on rodadas
  for update to authenticated
  using (owns_cliente(cliente_id))
  with check (owns_cliente(cliente_id));

create policy rodadas_delete_own on rodadas
  for delete to authenticated
  using (owns_cliente(cliente_id));

-- ---------------------------------------------------------------------------
-- convites
-- ---------------------------------------------------------------------------

create policy convites_select_own on convites
  for select to authenticated
  using (owns_rodada(rodada_id));

create policy convites_insert_own on convites
  for insert to authenticated
  with check (owns_rodada(rodada_id));

create policy convites_update_own on convites
  for update to authenticated
  using (owns_rodada(rodada_id))
  with check (owns_rodada(rodada_id));

create policy convites_delete_own on convites
  for delete to authenticated
  using (owns_rodada(rodada_id));

-- ---------------------------------------------------------------------------
-- respondentes e respostas — leitura apenas
--
-- Quem escreve aqui é a edge function com service role, depois de validar o
-- token. O consultor lê para acompanhar e agregar; nunca edita a resposta de
-- ninguém. A ausência de policy de escrita é deliberada.
-- ---------------------------------------------------------------------------

create policy respondentes_select_own on respondentes
  for select to authenticated
  using (owns_rodada(rodada_id));

create policy respostas_select_own on respostas
  for select to authenticated
  using (owns_respondente(respondente_id));

-- ---------------------------------------------------------------------------
-- perguntas — catálogo global, leitura para qualquer consultor autenticado.
--
-- Escrita não tem policy: fica com o service role até a Fase 3 definir quem
-- pode editar um banco de perguntas que é compartilhado entre consultores
-- (pendência registrada em docs/ARQUITETURA.md).
-- ---------------------------------------------------------------------------

create policy perguntas_select_authenticated on perguntas
  for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- relatorios
--
-- Update liberado porque o consultor edita a narrativa antes de exportar;
-- insert é da edge function gerar-relatorio.
-- ---------------------------------------------------------------------------

create policy relatorios_select_own on relatorios
  for select to authenticated
  using (owns_rodada(rodada_id));

create policy relatorios_update_own on relatorios
  for update to authenticated
  using (owns_rodada(rodada_id))
  with check (owns_rodada(rodada_id));
