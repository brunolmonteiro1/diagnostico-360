-- Diagnóstico 360 — profundidade qualitativa (Fase 6.1)
--
-- Com amostra pequena (n < 3 em todo recorte) nenhum número sai do relatório —
-- e está certo, porque com 4 pessoas não há estatística a fazer. O que sustenta
-- o diagnóstico nesse tamanho é o texto: exemplo concreto, causa provável,
-- consequência, tentativa anterior de resolver.
--
-- Esta migration faz três coisas:
--   1. promove as abertas de fechamento (A.01–A.06) a obrigatórias;
--   2. cria uma aberta obrigatória ao fim de cada bloco de área;
--   3. cria as justificativas condicionais (.J) que o motor de elegibilidade
--      dispara quando a pessoa dá nota baixa;
--   4. cria um comentário OPCIONAL por dimensão.
--
-- Idempotente por `codigo`, como o seed original: rodar de novo não duplica.

begin;

-- ---------------------------------------------------------------------------
-- 1. Abertas de fechamento viram obrigatórias
--
-- Deixar em branco continua sendo possível em qualquer campo de texto (o
-- respondente-salvar não valida tamanho, de propósito). "Obrigatória" aqui
-- significa que a pergunta é apresentada e cobrada na barra de progresso, não
-- que existe trava — travar produziria texto de fachada.
-- ---------------------------------------------------------------------------

update perguntas set obrigatoria = true
where codigo in ('A.01','A.02','A.03','A.04','A.05','A.06');

-- ---------------------------------------------------------------------------
-- 2, 3 e 4 — perguntas novas
-- ---------------------------------------------------------------------------

create temporary table _novas (
  codigo text, bloco text, dimensao text, area_scope text[], vinculo_scope text[],
  ordem int, enunciado text, ajuda text, tipo text,
  permite_nao_sei boolean, obrigatoria boolean
) on commit drop;

-- Roteiro pedido pelo consultor, num campo só. Sete campos separados seriam
-- sete caixas em branco: a pessoa cansa e responde pior. Um campo com roteiro
-- na ajuda produz texto mais longo e mais útil.
insert into _novas values

-- === Comentário opcional por dimensão (bloco universal) ===
('C.PAPEIS','universal','papeis','{}','{}',199,
 'Quer explicar alguma das respostas sobre papéis e responsabilidades?',
 'Opcional. Exemplos, situações concretas ou qualquer coisa que ajude a entender sua avaliação.',
 'texto_longo', false, false),
('C.PROCESSOS','universal','processos','{}','{}',299,
 'Quer explicar alguma das respostas sobre processos?',
 'Opcional. Exemplos, situações concretas ou qualquer coisa que ajude a entender sua avaliação.',
 'texto_longo', false, false),
('C.FERRAMENTAS','universal','ferramentas','{}','{}',399,
 'Quer explicar alguma das respostas sobre sistemas e ferramentas?',
 'Opcional. Exemplos, situações concretas ou qualquer coisa que ajude a entender sua avaliação.',
 'texto_longo', false, false),
('C.COMUNICACAO','universal','comunicacao','{}','{}',499,
 'Quer explicar alguma das respostas sobre comunicação?',
 'Opcional. Exemplos, situações concretas ou qualquer coisa que ajude a entender sua avaliação.',
 'texto_longo', false, false),
('C.LIDERANCA','universal','lideranca','{}','{}',599,
 'Quer explicar alguma das respostas sobre liderança e autonomia?',
 'Opcional. Exemplos, situações concretas ou qualquer coisa que ajude a entender sua avaliação.',
 'texto_longo', false, false),
('C.PESSOAS','universal','pessoas','{}','{}',699,
 'Quer explicar alguma das respostas sobre pessoas e desenvolvimento?',
 'Opcional. Exemplos, situações concretas ou qualquer coisa que ajude a entender sua avaliação.',
 'texto_longo', false, false),

-- === Justificativas condicionais (.J) ===
-- Só aparecem quando a âncora vem <= 2. Ver DEPENDENCIAS em elegibilidade.ts.
('D2.04.J','universal','processos','{}','{}',241,
 'Você marcou que refaz trabalho com frequência. Pode dar um exemplo recente?',
 'O que aconteceu, o que causou, quanto tempo custou e se já tentaram resolver antes.',
 'texto_longo', false, false),
('D2.07.J','universal','processos','{}','{}',271,
 'Você marcou que boa parte do trabalho depende de jeitinho. Qual é o exemplo mais claro?',
 'Descreva a situação, com que frequência acontece e o que aconteceria se a pessoa que "dá o jeito" não estivesse.',
 'texto_longo', false, false),
('D4.05.J','universal','comunicacao','{}','{}',451,
 'Você marcou que não se sente à vontade para discordar. O que faz você sentir isso?',
 'Se preferir, descreva o padrão em vez de um episódio específico.',
 'texto_longo', false, false),
('D5.02.J','universal','lideranca','{}','{}',521,
 'Você marcou que decisões travam esperando alguém. Que tipo de decisão trava, e por quanto tempo?',
 'Um exemplo recente ajuda mais que uma descrição geral.',
 'texto_longo', false, false),
('D5.06.J','universal','lideranca','{}','{}',561,
 'Você marcou que as prioridades mudam muito. Como isso aparece no seu dia?',
 'O que você deixa de terminar quando a prioridade muda, e quem costuma comunicar a mudança.',
 'texto_longo', false, false),
('LID.11.J','lideranca','lideranca','{}','{}',1111,
 'Você marcou que a operação não seguiria sem você. O que exatamente pararia?',
 'Liste as atividades e diga, para cada uma, quem poderia assumir hoje e o que faltaria a essa pessoa.',
 'texto_longo', false, false),
('OPE.07.J','area','processos','{operacional}','{}',1071,
 'Você marcou que uma pessoa concentra o conhecimento operacional. O que só ela sabe fazer?',
 'Liste as atividades e o que aconteceria se ela saísse de férias amanhã.',
 'texto_longo', false, false),
('FIN.02.J','area','processos','{financeiro}','{}',1021,
 'Você marcou que finanças da empresa e dos sócios se misturam. Como isso acontece na prática?',
 'Descreva os casos concretos: que tipo de despesa, com que frequência, e como fica registrado.',
 'texto_longo', false, false),

-- === Aberta obrigatória por bloco de área ===
('OPE.99','area',null,'{operacional}','{}',1099,
 'Sobre a operação: qual é o problema mais sério hoje?',
 'Descreva: (1) o que acontece, com exemplo recente; (2) por que você acha que acontece; (3) o que isso custa à empresa; (4) com que frequência se repete; (5) o que já tentaram para resolver; (6) o que você faria.',
 'texto_longo', false, true),
('FIN.99','area',null,'{financeiro}','{}',1199,
 'Sobre o financeiro: qual é o problema mais sério hoje?',
 'Descreva: (1) o que acontece, com exemplo recente; (2) por que você acha que acontece; (3) o que isso custa à empresa; (4) com que frequência se repete; (5) o que já tentaram para resolver; (6) o que você faria.',
 'texto_longo', false, true),
('COM.99','area',null,'{comercial}','{}',1299,
 'Sobre o comercial: qual é o problema mais sério hoje?',
 'Descreva: (1) o que acontece, com exemplo recente; (2) por que você acha que acontece; (3) o que isso custa à empresa; (4) com que frequência se repete; (5) o que já tentaram para resolver; (6) o que você faria.',
 'texto_longo', false, true),
('ATE.99','area',null,'{atendimento}','{}',1399,
 'Sobre o atendimento ao cliente: qual é o problema mais sério hoje?',
 'Descreva: (1) o que acontece, com exemplo recente; (2) por que você acha que acontece; (3) o que isso custa à empresa; (4) com que frequência se repete; (5) o que já tentaram para resolver; (6) o que você faria.',
 'texto_longo', false, true),
('RH.99','area',null,'{admrh}','{}',1499,
 'Sobre administrativo e pessoas: qual é o problema mais sério hoje?',
 'Descreva: (1) o que acontece, com exemplo recente; (2) por que você acha que acontece; (3) o que isso custa à empresa; (4) com que frequência se repete; (5) o que já tentaram para resolver; (6) o que você faria.',
 'texto_longo', false, true),
('TI.99','area',null,'{ti}','{}',1599,
 'Sobre sistemas e tecnologia: qual é o problema mais sério hoje?',
 'Descreva: (1) o que acontece, com exemplo recente; (2) por que você acha que acontece; (3) o que isso custa à empresa; (4) com que frequência se repete; (5) o que já tentaram para resolver; (6) o que você faria.',
 'texto_longo', false, true),
('MKT.99','area',null,'{marketing}','{}',1699,
 'Sobre marketing: qual é o problema mais sério hoje?',
 'Descreva: (1) o que acontece, com exemplo recente; (2) por que você acha que acontece; (3) o que isso custa à empresa; (4) com que frequência se repete; (5) o que já tentaram para resolver; (6) o que você faria.',
 'texto_longo', false, true),

-- === Autoavaliação dos sócios ===
-- Pedido explícito: que os sócios avaliem a própria gestão. Vínculo restrito
-- porque a pergunta só faz sentido para quem decide.
('LID.19','lideranca',null,'{}','{socio}',1190,
 'Como está dividido o trabalho entre os sócios hoje, e o que dessa divisão não funciona?',
 'Inclua o que é decidido em conjunto, o que cada um decide sozinho, e onde isso gera atrito ou demora.',
 'texto_longo', false, true),
('LID.20','lideranca',null,'{}','{socio}',1191,
 'Que decisões importantes vocês vêm adiando, e por quê?',
 'Liste as que você sabe que precisam ser tomadas e ainda não foram.',
 'texto_longo', false, true),
('LID.21','lideranca',null,'{}','{socio}',1192,
 'Em que a gestão de vocês hoje mais limita a empresa?',
 'Pode ser tempo, conhecimento, disposição para delegar, falta de método — o que for verdade.',
 'texto_longo', false, true);

insert into perguntas (
  codigo, bloco, dimensao, area_scope, vinculo_scope, ordem, enunciado, ajuda,
  tipo, opcoes, permite_nao_sei, invertida, peso, obrigatoria, ativa
)
select
  codigo, bloco::pergunta_bloco, dimensao, area_scope, vinculo_scope, ordem,
  enunciado, ajuda, tipo::pergunta_tipo, null,
  permite_nao_sei, false,
  -- Peso 0: pergunta aberta não entra na maturidade nem no denominador da
  -- visibilidade. Deixar em branco é normal e não pode derrubar indicador.
  0,
  obrigatoria, true
from _novas
on conflict (codigo) do update set
  bloco = excluded.bloco,
  dimensao = excluded.dimensao,
  area_scope = excluded.area_scope,
  vinculo_scope = excluded.vinculo_scope,
  ordem = excluded.ordem,
  enunciado = excluded.enunciado,
  ajuda = excluded.ajuda,
  tipo = excluded.tipo,
  permite_nao_sei = excluded.permite_nao_sei,
  peso = 0,
  obrigatoria = excluded.obrigatoria,
  ativa = true;

commit;
