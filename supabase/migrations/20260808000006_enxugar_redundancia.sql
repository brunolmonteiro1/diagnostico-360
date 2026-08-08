-- Diagnóstico 360 — enxugar redundância entre bloco universal e blocos de área
--
-- Motivo: sócio que atua em várias áreas acumulava 143 itens. Fadiga vira
-- resposta apressada, que é pior que pergunta faltando.
--
-- Critério do corte: só sai a pergunta cujo conteúdo JÁ é perguntado a todo
-- mundo no bloco universal. Nada é apagado — `ativa = false` preserva as
-- respostas históricas de quem já respondeu e permite reverter.
--
-- Deliberadamente NÃO cortado: pergunta que numa empresa de 4 pessoas tende a
-- ser respondida "não existe" (centro de custo, CAC, avaliação de desempenho).
-- Ausência de processo é achado, e agora tem opção própria para ser registrada
-- em um clique — o custo de responder é baixo e o valor é alto.

begin;

update perguntas set ativa = false
where codigo in (
  -- ≡ D2.05 "existe padrão ou checklist de conferência antes de eu entregar"
  'OPE.05',
  -- ≡ D2.02 "quando entra alguém novo, existe material ou treinamento"
  'RH.02',
  -- ≡ D3.04 "as informações de que preciso estão concentradas em um só lugar"
  'ATE.01',
  -- ≡ D2.01 "os processos que eu executo estão documentados"
  'OPE.01'
);

commit;
