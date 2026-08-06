-- Teste de isolamento por RLS — critério que bloqueia a Fase 1.
--
-- Dois consultores em ambiente de teste; prova que um não lê os registros do
-- outro, em toda a cadeia que desce de `clientes`, e que não consegue forjar
-- propriedade nem escrever onde só a edge function escreve.
--
-- Roda contra um Postgres com o shim de auth aplicado e as migrations reais.

create or replace function test_assert(cond boolean, msg text)
returns void
language plpgsql
as $$
begin
  if cond is not true then
    raise exception 'FALHOU: %', msg;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seed: dois consultores, cada um com a cadeia completa.
-- Feito como owner das tabelas, que não passa por RLS.
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@teste.dev', '{"nome":"Consultor A"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@teste.dev', '{"nome":"Consultor B"}');

do $$
begin
  perform test_assert(
    (select count(*) from profiles) = 2,
    'o trigger on_auth_user_created deveria ter criado 2 profiles'
  );
end;
$$;

insert into clientes (id, owner_id, nome_fantasia) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Cliente do A'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Cliente do B');

insert into rodadas (id, cliente_id, titulo) values
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Rodada A'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'Rodada B');

insert into convites (id, rodada_id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'p1@teste.dev'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002', 'p2@teste.dev');

insert into respondentes (id, rodada_id, convite_id, nome) values
  ('aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000003', 'Pessoa A'),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000002',
   'bbbbbbbb-0000-0000-0000-000000000003', 'Pessoa B');

insert into perguntas (id, codigo, bloco, tipo, enunciado) values
  ('cccccccc-0000-0000-0000-000000000001', 'FIN.01', 'area', 'likert5', 'Existe DRE mensal?'),
  ('cccccccc-0000-0000-0000-000000000002', 'FIN.02', 'area', 'likert5', 'O DRE é revisado?');

insert into respostas (respondente_id, pergunta_id, valor_num) values
  ('aaaaaaaa-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000001', 4),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000001', 2);

insert into relatorios (rodada_id) values
  ('aaaaaaaa-0000-0000-0000-000000000002'),
  ('bbbbbbbb-0000-0000-0000-000000000002');

-- ---------------------------------------------------------------------------
-- Consultor A
-- ---------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  false
);
set role authenticated;

do $$
begin
  perform test_assert((select count(*) from clientes) = 1,
    'A deveria ver exatamente 1 cliente (o seu)');
  perform test_assert(
    (select nome_fantasia from clientes) = 'Cliente do A',
    'o cliente visível para A deveria ser o dele');
  perform test_assert(
    (select count(*) from clientes
     where id = 'bbbbbbbb-0000-0000-0000-000000000001') = 0,
    'A NAO pode ler o cliente do B');

  -- A cadeia inteira desce de clientes: se a raiz isola, tudo isola.
  perform test_assert((select count(*) from rodadas) = 1, 'A deveria ver 1 rodada');
  perform test_assert((select count(*) from convites) = 1, 'A deveria ver 1 convite');
  perform test_assert((select count(*) from respondentes) = 1, 'A deveria ver 1 respondente');
  perform test_assert((select count(*) from respostas) = 1, 'A deveria ver 1 resposta');
  perform test_assert((select count(*) from relatorios) = 1, 'A deveria ver 1 relatorio');

  perform test_assert(
    (select count(*) from respostas where valor_num = 2) = 0,
    'A NAO pode ler a resposta do respondente do B');

  -- O profile também é privado.
  perform test_assert((select count(*) from profiles) = 1,
    'A deveria ver apenas o proprio profile');
end;
$$;

-- A não pode alterar nem apagar o que é do B: a RLS filtra as linhas antes,
-- então a operação atinge zero linhas em vez de falhar ruidosamente.
do $$
declare
  n integer;
begin
  update clientes set nome_fantasia = 'sequestrado'
  where id = 'bbbbbbbb-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  perform test_assert(n = 0, 'A NAO pode atualizar o cliente do B');

  delete from clientes where id = 'bbbbbbbb-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  perform test_assert(n = 0, 'A NAO pode apagar o cliente do B');

  update rodadas set titulo = 'sequestrada'
  where id = 'bbbbbbbb-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  perform test_assert(n = 0, 'A NAO pode atualizar a rodada do B');
end;
$$;

-- Forjar propriedade tem que ser barrado pelo `with check`, não pelo frontend.
do $$
begin
  begin
    insert into clientes (owner_id, nome_fantasia)
    values ('22222222-2222-2222-2222-222222222222', 'Cliente forjado');
    raise exception 'FALHOU: A conseguiu inserir cliente com owner_id do B';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update clientes set owner_id = '22222222-2222-2222-2222-222222222222'
    where id = 'aaaaaaaa-0000-0000-0000-000000000001';
    raise exception 'FALHOU: A conseguiu transferir o proprio cliente para o B';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into rodadas (cliente_id, titulo)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'Rodada intrusa');
    raise exception 'FALHOU: A conseguiu criar rodada no cliente do B';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- Resposta é escrita só pela edge function com service role. Nem na própria
-- rodada o consultor pode gravar ou editar resposta de alguém.
do $$
begin
  -- Pergunta 2, ainda sem resposta: se o insert for barrado, tem que ser por
  -- privilégio, e não por esbarrar na unicidade antes de chegar lá.
  begin
    insert into respostas (respondente_id, pergunta_id, valor_num)
    values ('aaaaaaaa-0000-0000-0000-000000000004',
            'cccccccc-0000-0000-0000-000000000002', 1);
    raise exception 'FALHOU: consultor conseguiu inserir resposta';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update respostas set valor_num = 5;
    raise exception 'FALHOU: consultor conseguiu editar resposta';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into perguntas (codigo, bloco, tipo, enunciado)
    values ('X.99', 'universal', 'likert5', 'intrusa');
    raise exception 'FALHOU: consultor conseguiu inserir pergunta';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

-- ---------------------------------------------------------------------------
-- Consultor B — a simetria importa: prova que o filtro é por identidade e não
-- um acaso de ordenação ou de dado.
-- ---------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
  false
);
set role authenticated;

do $$
begin
  perform test_assert((select count(*) from clientes) = 1,
    'B deveria ver exatamente 1 cliente');
  perform test_assert((select nome_fantasia from clientes) = 'Cliente do B',
    'o cliente visível para B deveria ser o dele');
  perform test_assert(
    (select count(*) from clientes
     where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0,
    'B NAO pode ler o cliente do A');
  perform test_assert((select count(*) from respostas) = 1,
    'B deveria ver 1 resposta');
  perform test_assert((select count(*) from respostas where valor_num = 4) = 0,
    'B NAO pode ler a resposta do respondente do A');
end;
$$;

reset role;

-- ---------------------------------------------------------------------------
-- Sem sessão: `authenticated` sem claims não é ninguém, e `anon` não tem grant.
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '', false);
set role authenticated;

do $$
begin
  perform test_assert((select count(*) from clientes) = 0,
    'sem claims de JWT nao se enxerga cliente nenhum');
end;
$$;

reset role;
set role anon;

do $$
begin
  begin
    perform count(*) from clientes;
    raise exception 'FALHOU: anon conseguiu consultar clientes';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform count(*) from respostas;
    raise exception 'FALHOU: anon conseguiu consultar respostas';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

-- ---------------------------------------------------------------------------
-- Constraint chk_nao_sei: um "não sei" não pode carregar valor junto.
-- É o princípio central do produto no nível mais baixo do sistema.
-- ---------------------------------------------------------------------------

-- Usa a pergunta 2, ainda sem resposta, para que uma violação de unicidade não
-- possa se disfarçar de violação de check.
do $$
begin
  begin
    insert into respostas (respondente_id, pergunta_id, nao_sei, valor_num)
    values ('aaaaaaaa-0000-0000-0000-000000000004',
            'cccccccc-0000-0000-0000-000000000002', true, 3);
    raise exception 'FALHOU: chk_nao_sei aceitou nao_sei com valor_num';
  exception
    when check_violation then null;
  end;

  begin
    insert into respostas (respondente_id, pergunta_id, nao_sei, valor_texto)
    values ('aaaaaaaa-0000-0000-0000-000000000004',
            'cccccccc-0000-0000-0000-000000000002', true, 'texto');
    raise exception 'FALHOU: chk_nao_sei aceitou nao_sei com valor_texto';
  exception
    when check_violation then null;
  end;

  begin
    insert into respostas (respondente_id, pergunta_id, nao_sei, valor_opcoes)
    values ('aaaaaaaa-0000-0000-0000-000000000004',
            'cccccccc-0000-0000-0000-000000000002', true, array['a']);
    raise exception 'FALHOU: chk_nao_sei aceitou nao_sei com valor_opcoes';
  exception
    when check_violation then null;
  end;

  -- E o caso legítimo — "não sei" sozinho — continua passando.
  insert into respostas (respondente_id, pergunta_id, nao_sei)
  values ('aaaaaaaa-0000-0000-0000-000000000004',
          'cccccccc-0000-0000-0000-000000000002', true);
end;
$$;

select 'RLS OK' as resultado;
