-- Diagnóstico 360 — enxugar os roteiros das perguntas abertas
--
-- O roteiro de 6 partes em cada aberta obrigatória parecia rigor, mas para
-- quem responde 3 blocos de área vira 18 sub-respostas. Pedir muito por campo
-- produz texto curto e genérico — o oposto do objetivo.
--
-- Três partes cobrem o essencial (o quê, por quê, quanto custa) e deixam
-- espaço para a pessoa desenvolver. "Se já tentaram resolver" fica no texto
-- como convite, não como item numerado.
--
-- Também torna A.01 e A.04 opcionais: as duas são a versão rasa do que a
-- aberta por bloco (X.99) já pergunta com profundidade. Manter as duas
-- obrigatórias cobrava a mesma reflexão duas vezes.

begin;

update perguntas
set ajuda = 'Descreva o que acontece, com um exemplo recente; por que você acha que acontece; e o que isso custa à empresa. Se já tentaram resolver antes, conte o que foi feito.'
where codigo in ('OPE.99','FIN.99','COM.99','ATE.99','RH.99','TI.99','MKT.99');

-- A.01 ("3 coisas que atrapalham") e A.04 ("mudaria uma coisa") continuam na
-- tela — só deixam de ser cobradas, porque X.99 pede o mesmo com mais rigor.
update perguntas set obrigatoria = false
where codigo in ('A.01','A.04');

commit;
