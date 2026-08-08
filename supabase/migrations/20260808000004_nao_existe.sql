-- Diagnóstico 360 — "Não existe atualmente" (Fase 6.1)
--
-- Distinção que faltava, e que importa mais em empresa pequena que em grande:
--
--   "não sei se temos DRE"  -> falta de visibilidade. Sai da maturidade e
--                              derruba o Índice de Visibilidade.
--   "sei que não temos DRE" -> ACHADO. Pontua no piso da escala e conta como
--                              item válido, porque a pessoa tem visibilidade
--                              sobre o tema: ela sabe que não existe.
--
-- Tratar as duas como a mesma coisa esconderia o problema justamente na
-- empresa onde ele é mais grave — a que não tem processo nenhum apareceria
-- como "sem dado" em vez de "sem processo".

begin;

alter table respostas
  add column nao_existe boolean not null default false;

comment on column respostas.nao_existe is
  'A pessoa SABE que o processo não existe. Pontua no piso e conta como válido — '
  'o oposto de nao_sei, apesar de ambos virem sem valor numérico.';

-- Só faz sentido em pergunta do tipo "Existe X / é feito Y". Perguntar
-- "não existe atualmente" para "me sinto preparado para minha função" seria
-- ruído; por isso é opt-in por pergunta, não global.
alter table perguntas
  add column permite_nao_existe boolean not null default false;

comment on column perguntas.permite_nao_existe is
  'Habilita a opção "Não existe atualmente". Ligar apenas em pergunta sobre '
  'existência de processo, controle ou prática.';

-- A constraint antiga cobria só nao_sei. Agora as duas marcações são
-- mutuamente exclusivas entre si e ambas zeram os campos de valor: não dá para
-- "não existir" e ter nota ao mesmo tempo, nem para não saber e saber que não
-- existe.
alter table respostas drop constraint chk_nao_sei;

alter table respostas add constraint chk_sem_valor_quando_marcado
  check (
    not (nao_sei and nao_existe)
    and (not (nao_sei or nao_existe) or (
      valor_num is null and valor_texto is null and valor_opcoes is null
    ))
  );

-- Liga a opção nas perguntas que perguntam por existência de processo,
-- controle ou documento. Idempotente: rodar de novo não muda nada.
update perguntas set permite_nao_existe = true
where codigo in (
  -- universal
  'D1.02','D2.01','D2.02','D2.05','D2.06','D3.07','D4.04','D5.03','D5.05','D6.02','D6.03',
  -- liderança
  'LID.01','LID.02','LID.04','LID.06','LID.07','LID.08','LID.09','LID.13',
  -- comercial
  'COM.01','COM.02','COM.05','COM.08',
  -- operacional
  'OPE.01','OPE.03','OPE.05','OPE.06',
  -- atendimento
  'ATE.01','ATE.02','ATE.03','ATE.04','ATE.05',
  -- financeiro
  'FIN.01','FIN.03','FIN.05','FIN.07','FIN.08','FIN.10',
  -- admrh
  'RH.01','RH.02','RH.03','RH.04','RH.06',
  -- ti
  'TI.01','TI.02','TI.03','TI.04'
);

commit;
