-- Testes do banco de perguntas (Fase 3).
--
-- Roda antes do teste de RLS de propósito: as contagens aqui só fazem sentido
-- com a tabela contendo exatamente o que o seed pôs.

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
-- Volume e distribuição
-- ---------------------------------------------------------------------------

do $$
begin
  perform test_assert((select count(*) from perguntas) = 146,
    'o seed deveria ter 146 perguntas');

  perform test_assert((select count(*) from perguntas where bloco = 'identificacao') = 10,
    'identificacao deveria ter 10');
  perform test_assert((select count(*) from perguntas where bloco = 'universal') = 44,
    'universal deveria ter 44');
  perform test_assert((select count(*) from perguntas where bloco = 'lideranca') = 18,
    'lideranca deveria ter 18');
  perform test_assert((select count(*) from perguntas where bloco = 'encerramento') = 3,
    'encerramento deveria ter 3');

  perform test_assert((select count(*) from perguntas where area_scope = '{comercial}') = 11,
    'comercial deveria ter 11');
  perform test_assert((select count(*) from perguntas where area_scope = '{marketing}') = 7,
    'marketing deveria ter 7');
  perform test_assert((select count(*) from perguntas where area_scope = '{operacional}') = 8,
    'operacional deveria ter 8');
  perform test_assert((select count(*) from perguntas where area_scope = '{atendimento}') = 7,
    'atendimento deveria ter 7');
  perform test_assert((select count(*) from perguntas where area_scope = '{financeiro}') = 13,
    'financeiro deveria ter 13');
  perform test_assert((select count(*) from perguntas where area_scope = '{admrh}') = 7,
    'admrh deveria ter 7');
  perform test_assert((select count(*) from perguntas where area_scope = '{ti}') = 7,
    'ti deveria ter 7');
  perform test_assert((select count(*) from perguntas where area_scope = '{juridico}') = 5,
    'juridico deveria ter 5');
  perform test_assert((select count(*) from perguntas where area_scope = '{franqueadora}') = 6,
    'franqueadora deveria ter 6');
end;
$$;

-- ---------------------------------------------------------------------------
-- O princípio central, como invariante de dados
--
-- Toda pergunta objetiva que pontua precisa oferecer "não sei". Se uma passar
-- sem, o respondente é obrigado a chutar e o chute entra na maturidade —
-- exatamente o que o produto existe para evitar.
-- ---------------------------------------------------------------------------

do $$
begin
  perform test_assert(
    (select count(*) from perguntas
     where not permite_nao_sei
       and bloco in ('universal', 'area', 'lideranca')
       and tipo in ('likert5','frequencia5','escala0a10','unica','multipla','numero')) = 0,
    'existe pergunta objetiva que pontua sem a opção "não sei"');
end;
$$;

-- ---------------------------------------------------------------------------
-- Invertidas
--
-- Verificadas UMA A UMA, por código. Inversão errada não quebra nada: produz
-- um diagnóstico invertido e plausível, que é o pior tipo de erro aqui.
-- ---------------------------------------------------------------------------

do $$
declare
  esperadas text[] := array[
    'ATE.06','D1.05','D1.06','D2.04','D2.07','D3.02','D4.07','D5.02','D5.06',
    'OPE.04','OPE.07'
  ];
  codigo_atual text;
begin
  foreach codigo_atual in array esperadas loop
    perform test_assert(
      (select invertida from perguntas where codigo = codigo_atual),
      format('%s deveria estar marcada como invertida', codigo_atual));
  end loop;

  -- E nenhuma além dessas: uma invertida a mais é tão grave quanto uma a menos.
  perform test_assert(
    (select count(*) from perguntas where invertida) = array_length(esperadas, 1),
    'existe pergunta invertida fora da lista esperada');
end;
$$;

-- ---------------------------------------------------------------------------
-- Pesos que separam empresa estruturada de empresa que depende de pessoa
-- ---------------------------------------------------------------------------

do $$
begin
  perform test_assert((select peso from perguntas where codigo = 'FIN.02') = 2.0,
    'FIN.02 (separação PF/PJ) deveria ter peso 2.0');
  perform test_assert((select peso from perguntas where codigo = 'FIN.03') = 2.0,
    'FIN.03 (DRE mensal) deveria ter peso 2.0');
  perform test_assert((select peso from perguntas where codigo = 'LID.11') = 2.0,
    'LID.11 (operação sobrevive 30 dias) deveria ter peso 2.0');

  -- Pergunta aberta não pontua: peso 0 evita que ela puxe média nenhuma.
  perform test_assert(
    (select count(*) from perguntas
     where tipo in ('texto_curto','texto_longo') and peso <> 0) = 0,
    'pergunta aberta não deveria ter peso');
end;
$$;

-- ---------------------------------------------------------------------------
-- Dependências condicionais: as três âncoras precisam existir e ser objetivas,
-- senão a regra de elegibilidade da Fase 4 aponta para o vazio.
-- ---------------------------------------------------------------------------

do $$
begin
  perform test_assert(
    (select count(*) from perguntas
     where codigo in ('D4.02','D4.03','COM.03','COM.04','FIN.03','FIN.04')) = 6,
    'faltam perguntas das três dependências condicionais');

  perform test_assert(
    (select count(*) from perguntas
     where codigo in ('D4.03','COM.04','FIN.04') and obrigatoria) = 0,
    'follow-up condicional não pode ser obrigatório: ficar em branco é dado');
end;
$$;

-- ---------------------------------------------------------------------------
-- Idempotência — o critério que bloqueava a fase
-- ---------------------------------------------------------------------------

\ir ../../supabase/migrations/20260807000003_seed_perguntas.sql

do $$
begin
  perform test_assert((select count(*) from perguntas) = 146,
    'rodar o seed duas vezes duplicou perguntas');
  perform test_assert((select count(*) from perguntas where ativa) = 146,
    'a segunda passada desativou pergunta que deveria continuar ativa');
  perform test_assert(
    (select enunciado from perguntas where codigo = 'FIN.03') = 'Existe DRE mensal',
    'a segunda passada corrompeu o enunciado');
end;
$$;

-- ---------------------------------------------------------------------------
-- Pergunta fora do seed é DESATIVADA, nunca apagada — apagar levaria junto as
-- respostas históricas que apontam para ela.
-- ---------------------------------------------------------------------------

insert into perguntas (codigo, bloco, tipo, enunciado)
values ('ZZZ.99', 'universal', 'likert5', 'Pergunta aposentada');

\ir ../../supabase/migrations/20260807000003_seed_perguntas.sql

do $$
begin
  perform test_assert(
    (select count(*) from perguntas where codigo = 'ZZZ.99') = 1,
    'pergunta fora do seed foi APAGADA — levaria junto as respostas históricas');
  perform test_assert(
    (select not ativa from perguntas where codigo = 'ZZZ.99'),
    'pergunta fora do seed deveria ter sido desativada');
end;
$$;

delete from perguntas where codigo = 'ZZZ.99';

select 'SEED OK' as resultado;
