-- =====================================================================
-- Diagnóstico 360 · Ethos Lab
-- Migration 0003 — Seed do banco de perguntas
-- Idempotente: rodar N vezes não duplica (upsert por codigo).
--
-- Convenções:
--   area_scope    = '{}' -> pergunta aparece para TODAS as áreas
--   vinculo_scope = '{}' -> aparece para TODOS os vínculos
--   invertida     = true -> concordar indica PROBLEMA (motor espelha: v = 6 - v)
--   peso          > 1.0  -> item de alto valor diagnóstico
--   opcoes        = jsonb [{ "valor": n, "rotulo": "..." }]
--
-- Slugs de área usados em area_scope e em rodadas.modulos_ativos:
--   comercial · marketing · operacional · atendimento · financeiro
--   admrh · ti · juridico · franqueadora · diretoria · outra
-- =====================================================================

begin;

create temporary table _seed_perguntas (
  codigo text, bloco text, dimensao text, area_scope text[], vinculo_scope text[],
  ordem int, enunciado text, ajuda text, tipo text, opcoes jsonb,
  permite_nao_sei boolean, invertida boolean, peso numeric, obrigatoria boolean
) on commit drop;

-- ============ BLOCO 0 · IDENTIFICAÇÃO ============
insert into _seed_perguntas values
('ID.01','identificacao',null,'{}','{}',1,'Nome completo',null,'texto_curto',null,false,false,0,true),
('ID.02','identificacao',null,'{}','{}',2,'E-mail','Usamos apenas para controle de envio e para você poder retomar o questionário.','texto_curto',null,false,false,0,true),
('ID.03','identificacao',null,'{}','{}',3,'Cargo ou função','Como está no seu contrato ou como as pessoas te chamam no dia a dia.','texto_curto',null,false,false,0,true),
('ID.04','identificacao',null,'{}','{}',4,'Em qual área você atua principalmente?','Escolha onde você passa a maior parte do seu tempo.','unica',
  '[{"valor":"comercial","rotulo":"Comercial / Vendas"},{"valor":"marketing","rotulo":"Marketing"},{"valor":"operacional","rotulo":"Operacional / Backoffice"},{"valor":"atendimento","rotulo":"Atendimento e Pós-venda"},{"valor":"financeiro","rotulo":"Financeiro"},{"valor":"admrh","rotulo":"Administrativo / RH"},{"valor":"ti","rotulo":"TI e Sistemas"},{"valor":"juridico","rotulo":"Jurídico / Contratos"},{"valor":"diretoria","rotulo":"Diretoria / Sócios"},{"valor":"franqueadora","rotulo":"Relacionamento com Franqueadora / Matriz"},{"valor":"outra","rotulo":"Outra"}]',
  false,false,0,true),
('ID.05','identificacao',null,'{}','{}',5,'Você também atua em outras áreas?','Marque todas que se aplicam. Se atua só em uma, deixe em branco.','multipla',
  '[{"valor":"comercial","rotulo":"Comercial / Vendas"},{"valor":"marketing","rotulo":"Marketing"},{"valor":"operacional","rotulo":"Operacional / Backoffice"},{"valor":"atendimento","rotulo":"Atendimento e Pós-venda"},{"valor":"financeiro","rotulo":"Financeiro"},{"valor":"admrh","rotulo":"Administrativo / RH"},{"valor":"ti","rotulo":"TI e Sistemas"},{"valor":"juridico","rotulo":"Jurídico / Contratos"}]',
  false,false,0,false),
('ID.06','identificacao',null,'{}','{}',6,'Qual é o seu vínculo com a empresa?',null,'unica',
  '[{"valor":"socio","rotulo":"Sócio / Proprietário"},{"valor":"gestor","rotulo":"Gestor / Líder de equipe"},{"valor":"colaborador","rotulo":"Colaborador"},{"valor":"terceirizado","rotulo":"Terceirizado / PJ"},{"valor":"estagiario","rotulo":"Estagiário / Aprendiz"},{"valor":"franqueadora","rotulo":"Franqueadora / Matriz"}]',
  false,false,0,true),
('ID.07','identificacao',null,'{}','{}',7,'Há quanto tempo você está na empresa?',null,'unica',
  '[{"valor":"menos_6m","rotulo":"Menos de 6 meses"},{"valor":"6m_1a","rotulo":"De 6 meses a 1 ano"},{"valor":"1a_3a","rotulo":"De 1 a 3 anos"},{"valor":"3a_5a","rotulo":"De 3 a 5 anos"},{"valor":"mais_5a","rotulo":"Mais de 5 anos"}]',
  false,false,0,true),
('ID.08','identificacao',null,'{}','{}',8,'A quem você reporta no dia a dia?','Se não souber com clareza, escreva isso mesmo.','texto_curto',null,false,false,0,true),
('ID.09','identificacao',null,'{}','{}',9,'Quantas pessoas reportam a você?','Zero se ninguém.','numero',null,false,false,0,true),
('ID.10','identificacao',null,'{}','{}',10,'Autorizo o uso das minhas respostas para fins deste diagnóstico, nos termos da LGPD','Suas respostas individuais não são compartilhadas com a empresa. O relatório é agregado.','unica',
  '[{"valor":"sim","rotulo":"Sim, autorizo"},{"valor":"nao","rotulo":"Não autorizo"}]',
  false,false,0,true);

-- ============ BLOCO 1 · UNIVERSAL ============
-- D1 · Clareza de papéis
insert into _seed_perguntas values
('D1.01','universal','papeis','{}','{}',101,'Sei exatamente quais são as minhas responsabilidades no dia a dia',null,'likert5',null,true,false,1.0,true),
('D1.02','universal','papeis','{}','{}',102,'Existe uma descrição escrita do meu cargo e das minhas funções',null,'likert5',null,true,false,1.2,true),
('D1.03','universal','papeis','{}','{}',103,'Sei a quem recorrer quando aparece um problema fora da minha alçada',null,'likert5',null,true,false,1.0,true),
('D1.04','universal','papeis','{}','{}',104,'As outras pessoas da empresa sabem o que é e o que não é responsabilidade minha',null,'likert5',null,true,false,1.0,true),
('D1.05','universal','papeis','{}','{}',105,'Executo tarefas que deveriam ser de outra pessoa',null,'frequencia5',null,true,true,1.2,true),
('D1.06','universal','papeis','{}','{}',106,'Existem tarefas importantes que ninguém assumiu e ficam sem dono',null,'frequencia5',null,true,true,1.2,true);

-- D2 · Processos e padronização
insert into _seed_perguntas values
('D2.01','universal','processos','{}','{}',201,'Os processos que eu executo estão documentados (manual, passo a passo, POP)',null,'likert5',null,true,false,1.5,true),
('D2.02','universal','processos','{}','{}',202,'Quando entra alguém novo, existe material ou treinamento para aprender o processo',null,'likert5',null,true,false,1.2,true),
('D2.03','universal','processos','{}','{}',203,'Consigo executar meu trabalho sem depender de alguém lembrar como se faz',null,'likert5',null,true,false,1.5,true),
('D2.04','universal','processos','{}','{}',204,'Refaço trabalho por erro, informação incompleta ou falha de comunicação',null,'frequencia5',null,true,true,1.2,true),
('D2.05','universal','processos','{}','{}',205,'Existe um padrão ou checklist de conferência antes de eu entregar meu trabalho',null,'likert5',null,true,false,1.0,true),
('D2.06','universal','processos','{}','{}',206,'Quando um processo falha, existe um caminho definido para corrigir e evitar que se repita',null,'likert5',null,true,false,1.0,true),
('D2.07','universal','processos','{}','{}',207,'Uma parte relevante do meu trabalho depende de jeitinho ou exceção',null,'frequencia5',null,true,true,1.0,true);

-- D3 · Ferramentas e sistemas
insert into _seed_perguntas values
('D3.01','universal','ferramentas','{}','{}',301,'Os sistemas que uso hoje atendem à minha necessidade',null,'likert5',null,true,false,1.0,true),
('D3.02','universal','ferramentas','{}','{}',302,'Uso planilhas paralelas, WhatsApp ou anotações para suprir o que o sistema não faz',null,'frequencia5',null,true,true,1.3,true),
('D3.03','universal','ferramentas','{}','{}',303,'Recebi treinamento adequado nos sistemas que preciso usar',null,'likert5',null,true,false,1.2,true),
('D3.04','universal','ferramentas','{}','{}',304,'As informações de que preciso estão concentradas em um só lugar',null,'likert5',null,true,false,1.0,true),
('D3.05','universal','ferramentas','{}','{}',305,'Quantos sistemas ou ferramentas diferentes você abre num dia normal de trabalho?',null,'unica',
  '[{"valor":1,"rotulo":"1"},{"valor":2,"rotulo":"2 a 3"},{"valor":3,"rotulo":"4 a 5"},{"valor":4,"rotulo":"6 ou mais"}]',
  true,false,0,true),
('D3.06','universal','ferramentas','{}','{}',306,'Liste as ferramentas e sistemas que você usa no trabalho','Inclua WhatsApp, planilhas e caderno se for o caso.','texto_curto',null,true,false,0,false),
('D3.07','universal','ferramentas','{}','{}',307,'Quando um sistema novo foi implantado, houve plano, teste piloto e treinamento antes de virar a chave',null,'likert5',null,true,false,1.3,true);

-- D4 · Comunicação e informação
insert into _seed_perguntas values
('D4.01','universal','comunicacao','{}','{}',401,'As decisões importantes chegam até mim de forma clara e no tempo certo',null,'likert5',null,true,false,1.0,true),
('D4.02','universal','comunicacao','{}','{}',402,'Sei quais são as metas da empresa para este ano',null,'likert5',null,true,false,1.2,true),
('D4.03','universal','comunicacao','{}','{}',403,'Qual é a meta?','Aparece apenas para quem respondeu que sabe. Se não lembrar do número exato, escreva o que lembra.','texto_curto',null,true,false,0,false),
('D4.04','universal','comunicacao','{}','{}',404,'Existem reuniões periódicas na minha área, com pauta e encaminhamentos registrados',null,'likert5',null,true,false,1.0,true),
('D4.05','universal','comunicacao','{}','{}',405,'Consigo apontar problemas e discordar sem medo de retaliação',null,'likert5',null,true,false,1.3,true),
('D4.06','universal','comunicacao','{}','{}',406,'Quando preciso de uma informação de outra área, consigo obtê-la rapidamente',null,'likert5',null,true,false,1.0,true),
('D4.07','universal','comunicacao','{}','{}',407,'Informação importante chega até mim por conversa de corredor ou por acaso',null,'frequencia5',null,true,true,1.0,true);

-- D5 · Liderança e decisão
insert into _seed_perguntas values
('D5.01','universal','lideranca','{}','{}',501,'Tenho autonomia para decidir dentro da minha função',null,'likert5',null,true,false,1.0,true),
('D5.02','universal','lideranca','{}','{}',502,'As decisões travam esperando a aprovação de uma pessoa específica',null,'frequencia5',null,true,true,1.5,true),
('D5.03','universal','lideranca','{}','{}',503,'Recebo retorno sobre meu desempenho com regularidade',null,'likert5',null,true,false,1.0,true),
('D5.04','universal','lideranca','{}','{}',504,'Minha liderança está disponível quando preciso',null,'likert5',null,true,false,1.0,true),
('D5.05','universal','lideranca','{}','{}',505,'Quando há conflito entre áreas, existe critério ou alguém que resolve',null,'likert5',null,true,false,1.0,true),
('D5.06','universal','lideranca','{}','{}',506,'As prioridades mudam de um dia para o outro',null,'frequencia5',null,true,true,1.2,true);

-- D6 · Pessoas, cultura e capacitação
insert into _seed_perguntas values
('D6.01','universal','pessoas','{}','{}',601,'Me sinto tecnicamente preparado para a função que exerço',null,'likert5',null,true,false,1.0,true),
('D6.02','universal','pessoas','{}','{}',602,'Recebi treinamento estruturado quando entrei na empresa',null,'likert5',null,true,false,1.2,true),
('D6.03','universal','pessoas','{}','{}',603,'Existe caminho de desenvolvimento ou carreira para mim aqui',null,'likert5',null,true,false,1.0,true),
('D6.04','universal','pessoas','{}','{}',604,'O volume de trabalho da minha área é compatível com o tamanho do time',null,'likert5',null,true,false,1.2,true),
('D6.05','universal','pessoas','{}','{}',605,'De 0 a 10, quanto você recomendaria esta empresa como lugar para trabalhar?','0 = de jeito nenhum · 10 = com certeza','escala0a10',null,true,false,0,true);

-- Abertas universais
insert into _seed_perguntas values
('A.01','universal',null,'{}','{}',701,'Cite até 3 coisas que mais atrapalham o seu dia a dia',null,'texto_longo',null,true,false,0,false),
('A.02','universal',null,'{}','{}',702,'O que você faz hoje que, na sua opinião, não deveria ser sua função?',null,'texto_longo',null,true,false,0,false),
('A.03','universal',null,'{}','{}',703,'Se você ficasse 15 dias fora, o que pararia ou atrasaria?',null,'texto_longo',null,true,false,0,false),
('A.04','universal',null,'{}','{}',704,'Se pudesse mudar uma única coisa na empresa amanhã, o que seria?',null,'texto_longo',null,true,false,0,false),
('A.05','universal',null,'{}','{}',705,'O que a empresa faz bem e não pode perder?',null,'texto_longo',null,true,false,0,false),
('A.06','universal',null,'{}','{}',706,'Existe algum risco ou problema que você acha que a direção não está enxergando?','Opcional.','texto_longo',null,true,false,0,false);

-- ============ BLOCO 2 · POR ÁREA ============

-- 2.1 Comercial / Vendas
insert into _seed_perguntas values
('COM.01','area','processos','{comercial}','{}',1101,'Tenho meta individual clara e comunicada',null,'likert5',null,true,false,1.2,true),
('COM.02','area','ferramentas','{comercial}','{}',1102,'Todas as oportunidades em negociação ficam registradas em sistema, não só na minha cabeça ou no WhatsApp',null,'likert5',null,true,false,1.5,true),
('COM.03','area','processos','{comercial}','{}',1103,'Sei qual é a minha taxa de conversão (propostas que viram venda)',null,'likert5',null,true,false,1.2,true),
('COM.04','area',null,'{comercial}','{}',1104,'Qual é, aproximadamente?','Aparece apenas para quem respondeu que sabe.','texto_curto',null,true,false,0,false),
('COM.05','area','processos','{comercial}','{}',1105,'Existe um processo padrão de abordagem, proposta e follow-up',null,'likert5',null,true,false,1.3,true),
('COM.06','area','processos','{comercial}','{}',1106,'Os leads que recebo têm origem identificada (sei de onde vieram)',null,'likert5',null,true,false,1.0,true),
('COM.07','area',null,'{comercial}','{}',1107,'Quanto tempo, em média, entre o cliente pedir uma cotação e receber a proposta?',null,'unica',
  '[{"valor":1,"rotulo":"Até 1 hora"},{"valor":2,"rotulo":"Até 4 horas"},{"valor":3,"rotulo":"Até 24 horas"},{"valor":4,"rotulo":"De 1 a 3 dias"},{"valor":5,"rotulo":"Mais de 3 dias"}]',
  true,false,0,true),
('COM.08','area','processos','{comercial}','{}',1108,'Existe política escrita de desconto e de comissão',null,'likert5',null,true,false,1.2,true),
('COM.09','area',null,'{comercial}','{}',1109,'Quanto do seu tempo é venda de fato, e quanto é tarefa administrativa?',null,'unica',
  '[{"valor":1,"rotulo":"Mais de 80% vendendo"},{"valor":2,"rotulo":"Entre 60% e 80% vendendo"},{"valor":3,"rotulo":"Entre 40% e 60% vendendo"},{"valor":4,"rotulo":"Menos de 40% vendendo"}]',
  true,false,0,true),
('COM.10','area',null,'{comercial}','{}',1110,'Quais produtos ou serviços você vende hoje?',null,'multipla',
  '[{"valor":"seguro_auto","rotulo":"Seguro auto / frota"},{"valor":"seguro_carga","rotulo":"Seguro de carga"},{"valor":"seguro_vida","rotulo":"Seguro de vida"},{"valor":"seguro_patrimonial","rotulo":"Seguro patrimonial / empresarial"},{"valor":"consorcio","rotulo":"Consórcio"},{"valor":"produtos_fisicos","rotulo":"Produtos físicos (pneus, peças, acessórios)"},{"valor":"servicos","rotulo":"Serviços / assistência"},{"valor":"outro","rotulo":"Outro"}]',
  true,false,0,false),
('COM.11','area',null,'{comercial}','{}',1111,'O que mais faz a empresa perder venda hoje?',null,'texto_longo',null,true,false,0,false);

-- 2.2 Marketing
insert into _seed_perguntas values
('MKT.01','area','processos','{marketing}','{}',1201,'Existe planejamento de marketing com calendário definido',null,'likert5',null,true,false,1.2,true),
('MKT.02','area','processos','{marketing}','{}',1202,'Sabemos quanto custa gerar um lead',null,'likert5',null,true,false,1.3,true),
('MKT.03','area','processos','{marketing}','{}',1203,'Os leads gerados são repassados ao comercial com prazo e responsável definidos',null,'likert5',null,true,false,1.5,true),
('MKT.04','area','processos','{marketing}','{}',1204,'Medimos o resultado das campanhas — não só alcance, mas venda',null,'likert5',null,true,false,1.3,true),
('MKT.05','area','processos','{marketing}','{}',1205,'Existe padrão de identidade visual e fluxo de aprovação de peças',null,'likert5',null,true,false,1.0,true),
('MKT.06','area',null,'{marketing}','{}',1206,'Quais canais estão ativos hoje?',null,'multipla',
  '[{"valor":"instagram","rotulo":"Instagram"},{"valor":"google_ads","rotulo":"Google Ads"},{"valor":"meta_ads","rotulo":"Meta Ads"},{"valor":"whatsapp","rotulo":"WhatsApp"},{"valor":"indicacao","rotulo":"Indicação"},{"valor":"prospeccao","rotulo":"Prospecção ativa"},{"valor":"eventos","rotulo":"Eventos"},{"valor":"site_seo","rotulo":"Site / SEO"},{"valor":"nenhum","rotulo":"Nenhum"}]',
  true,false,0,false),
('MKT.07','area',null,'{marketing}','{}',1207,'O que você faria com o dobro do orçamento? E com metade?',null,'texto_longo',null,true,false,0,false);

-- 2.3 Operacional / Backoffice
insert into _seed_perguntas values
('OPE.01','area','processos','{operacional}','{}',1301,'Existe uma fila ou controle de demandas visível para todos da área',null,'likert5',null,true,false,1.3,true),
('OPE.02','area','processos','{operacional}','{}',1302,'Sei qual demanda priorizar quando várias chegam ao mesmo tempo',null,'likert5',null,true,false,1.2,true),
('OPE.03','area','processos','{operacional}','{}',1303,'Existe prazo de atendimento (SLA) definido e conhecido pelo time',null,'likert5',null,true,false,1.2,true),
('OPE.04','area','processos','{operacional}','{}',1304,'Recebo demandas com informação incompleta e preciso voltar para pedir dados',null,'frequencia5',null,true,true,1.3,true),
('OPE.05','area','processos','{operacional}','{}',1305,'Existe checklist de conferência antes de finalizar e entregar',null,'likert5',null,true,false,1.0,true),
('OPE.06','area','ferramentas','{operacional}','{}',1306,'Renovações, vencimentos e recorrências são controlados por sistema com alerta automático',null,'likert5',null,true,false,1.5,true),
('OPE.07','area','papeis','{operacional}','{}',1307,'Uma pessoa específica concentra a maior parte do conhecimento operacional',null,'likert5',null,true,true,1.5,true),
('OPE.08','area',null,'{operacional}','{}',1308,'Onde a demanda mais trava hoje, e por quê?',null,'texto_longo',null,true,false,0,false);

-- 2.4 Atendimento e Pós-venda
insert into _seed_perguntas values
('ATE.01','area','ferramentas','{atendimento}','{}',1401,'Os canais de contato do cliente estão centralizados em um só lugar',null,'likert5',null,true,false,1.3,true),
('ATE.02','area','ferramentas','{atendimento}','{}',1402,'Todo atendimento fica registrado, com histórico consultável do cliente',null,'likert5',null,true,false,1.5,true),
('ATE.03','area','processos','{atendimento}','{}',1403,'Existe prazo definido de resposta ao cliente',null,'likert5',null,true,false,1.2,true),
('ATE.04','area','processos','{atendimento}','{}',1404,'Fazemos alguma medição de satisfação do cliente',null,'likert5',null,true,false,1.0,true),
('ATE.05','area','processos','{atendimento}','{}',1405,'Reclamações são registradas e analisadas, não só resolvidas caso a caso',null,'likert5',null,true,false,1.2,true),
('ATE.06','area','ferramentas','{atendimento}','{}',1406,'Mensagens de cliente chegam no celular pessoal de alguém e se perdem',null,'frequencia5',null,true,true,1.5,true),
('ATE.07','area',null,'{atendimento}','{}',1407,'Quais são os 3 motivos mais comuns de reclamação?',null,'texto_longo',null,true,false,0,false);

-- 2.5 Financeiro
insert into _seed_perguntas values
('FIN.01','area','ferramentas','{financeiro}','{}',1501,'Contas a pagar e a receber estão controladas em sistema, não em planilha solta',null,'likert5',null,true,false,1.5,true),
('FIN.02','area','processos','{financeiro}','{}',1502,'Existe separação clara entre as finanças da empresa e as finanças pessoais dos sócios',null,'likert5',null,true,false,2.0,true),
('FIN.03','area','processos','{financeiro}','{}',1503,'Existe DRE mensal',null,'likert5',null,true,false,2.0,true),
('FIN.04','area',null,'{financeiro}','{}',1504,'Até que dia do mês seguinte o DRE fica pronto?','Aparece apenas para quem respondeu que existe DRE.','unica',
  '[{"valor":1,"rotulo":"Até o dia 5"},{"valor":2,"rotulo":"Até o dia 10"},{"valor":3,"rotulo":"Até o dia 20"},{"valor":4,"rotulo":"Depois do dia 20"}]',
  true,false,0,false),
('FIN.05','area','processos','{financeiro}','{}',1505,'Existe projeção de fluxo de caixa para as próximas semanas ou meses',null,'likert5',null,true,false,1.8,true),
('FIN.06','area',null,'{financeiro}','{}',1506,'Com que frequência a conciliação bancária é feita?',null,'unica',
  '[{"valor":1,"rotulo":"Diária"},{"valor":2,"rotulo":"Semanal"},{"valor":3,"rotulo":"Mensal"},{"valor":4,"rotulo":"Esporádica"},{"valor":5,"rotulo":"Não é feita"}]',
  true,false,0,true),
('FIN.07','area','processos','{financeiro}','{}',1507,'Comissões e repasses são calculados por regra clara e conferíveis',null,'likert5',null,true,false,1.5,true),
('FIN.08','area','processos','{financeiro}','{}',1508,'Existe centro de custo separado por área, unidade ou produto',null,'likert5',null,true,false,1.3,true),
('FIN.09','area','processos','{financeiro}','{}',1509,'A contabilidade entrega mais do que as guias de imposto — relatórios, análise, orientação',null,'likert5',null,true,false,1.3,true),
('FIN.10','area','processos','{financeiro}','{}',1510,'Existe controle de inadimplência com régua de cobrança definida',null,'likert5',null,true,false,1.2,true),
('FIN.11','area',null,'{financeiro}','{}',1511,'Quantas horas por semana você gasta em tarefas financeiras manuais e repetitivas?',null,'unica',
  '[{"valor":1,"rotulo":"Menos de 2 horas"},{"valor":2,"rotulo":"De 2 a 5 horas"},{"valor":3,"rotulo":"De 5 a 10 horas"},{"valor":4,"rotulo":"Mais de 10 horas"}]',
  true,false,0,true),
('FIN.12','area','processos','{financeiro}','{}',1512,'Sabemos qual produto ou serviço dá mais margem',null,'likert5',null,true,false,1.5,true),
('FIN.13','area',null,'{financeiro}','{}',1513,'Qual é hoje a maior dor do financeiro?',null,'texto_longo',null,true,false,0,false);

-- 2.6 Administrativo / RH
insert into _seed_perguntas values
('RH.01','area','processos','{admrh}','{}',1601,'Existe processo definido de contratação — perfil, entrevista, critério de decisão',null,'likert5',null,true,false,1.3,true),
('RH.02','area','pessoas','{admrh}','{}',1602,'Existe onboarding estruturado para quem entra',null,'likert5',null,true,false,1.3,true),
('RH.03','area','ferramentas','{admrh}','{}',1603,'Documentos de pessoal estão organizados e localizáveis',null,'likert5',null,true,false,1.0,true),
('RH.04','area','papeis','{admrh}','{}',1604,'Existe descrição de cargos com faixa salarial definida',null,'likert5',null,true,false,1.3,true),
('RH.05','area','processos','{admrh}','{}',1605,'Férias, ponto e benefícios são controlados de forma confiável',null,'likert5',null,true,false,1.2,true),
('RH.06','area','pessoas','{admrh}','{}',1606,'Existe avaliação de desempenho periódica',null,'likert5',null,true,false,1.0,true),
('RH.07','area',null,'{admrh}','{}',1607,'Por que as pessoas costumam sair da empresa?',null,'texto_longo',null,true,false,0,false);

-- 2.7 TI e Sistemas
insert into _seed_perguntas values
('TI.01','area','ferramentas','{ti}','{}',1701,'Existe inventário dos sistemas contratados, com custo e responsável',null,'likert5',null,true,false,1.2,true),
('TI.02','area','processos','{ti}','{}',1702,'Existe controle de quem acessa o quê, e os acessos são revogados quando alguém sai',null,'likert5',null,true,false,1.8,true),
('TI.03','area','processos','{ti}','{}',1703,'Existe backup e ele já foi testado (restaurado) alguma vez',null,'likert5',null,true,false,1.8,true),
('TI.04','area','papeis','{ti}','{}',1704,'Existe um responsável definido por TI, interno ou terceirizado',null,'likert5',null,true,false,1.3,true),
('TI.05','area','processos','{ti}','{}',1705,'Os dados de clientes estão tratados conforme a LGPD',null,'likert5',null,true,false,1.5,true),
('TI.06','area',null,'{ti}','{}',1706,'Os sistemas conversam entre si ou os dados passam manualmente de um para o outro?',null,'unica',
  '[{"valor":1,"rotulo":"Integrados"},{"valor":2,"rotulo":"Parcialmente integrados"},{"valor":3,"rotulo":"Tudo manual"}]',
  true,false,0,true),
('TI.07','area',null,'{ti}','{}',1707,'Qual foi o último problema sério de sistema e como foi resolvido?',null,'texto_longo',null,true,false,0,false);

-- 2.8 Jurídico e Contratos
insert into _seed_perguntas values
('JUR.01','area','processos','{juridico}','{}',1801,'Contratos com clientes e fornecedores seguem modelo padronizado e revisado',null,'likert5',null,true,false,1.3,true),
('JUR.02','area','processos','{juridico}','{}',1802,'Existe controle de vencimento e renovação de contratos',null,'likert5',null,true,false,1.3,true),
('JUR.03','area','processos','{juridico}','{}',1803,'A empresa conhece o tamanho do seu passivo tributário e trabalhista',null,'likert5',null,true,false,1.8,true),
('JUR.04','area','processos','{juridico}','{}',1804,'As obrigações regulatórias e contratuais estão sendo cumpridas',null,'likert5',null,true,false,1.5,true),
('JUR.05','area','papeis','{juridico}','{}',1805,'Existe alguém responsável por acompanhar prazos e obrigações legais',null,'likert5',null,true,false,1.3,true);

-- 2.9 Franqueadora / Matriz (módulo opcional)
insert into _seed_perguntas values
('FRA.01','area','processos','{franqueadora}','{}',1901,'Conheço as obrigações e os direitos previstos no contrato de franquia',null,'likert5',null,true,false,1.5,true),
('FRA.02','area','processos','{franqueadora}','{}',1902,'Existe manual de operação da franquia e ele é usado no dia a dia',null,'likert5',null,true,false,1.3,true),
('FRA.03','area','processos','{franqueadora}','{}',1903,'O suporte da franqueadora atende quando precisamos',null,'likert5',null,true,false,1.2,true),
('FRA.04','area','ferramentas','{franqueadora}','{}',1904,'Os sistemas fornecidos pela matriz atendem à nossa operação',null,'likert5',null,true,false,1.3,true),
('FRA.05','area','comunicacao','{franqueadora}','{}',1905,'Mudanças da matriz chegam com antecedência e preparo suficientes',null,'likert5',null,true,false,1.3,true),
('FRA.06','area',null,'{franqueadora}','{}',1906,'O que a franqueadora deveria oferecer e não oferece?',null,'texto_longo',null,true,false,0,false);

-- ============ BLOCO 3 · LIDERANÇA E SÓCIOS ============
insert into _seed_perguntas values
('LID.01','lideranca','processos','{}','{socio,gestor}',2101,'Existe um plano escrito para os próximos 12 meses',null,'likert5',null,true,false,1.5,true),
('LID.02','lideranca','processos','{}','{socio,gestor}',2102,'Existe meta de faturamento definida e acompanhada mensalmente',null,'likert5',null,true,false,1.5,true),
('LID.03','lideranca','processos','{}','{socio,gestor}',2103,'Sabemos qual é o custo de aquisição de um cliente novo',null,'likert5',null,true,false,1.3,true),
('LID.04','lideranca','papeis','{}','{socio,gestor}',2104,'Existe organograma atualizado da empresa',null,'likert5',null,true,false,1.2,true),
('LID.05','lideranca',null,'{}','{socio,gestor}',2105,'Quais indicadores você acompanha de fato, toda semana ou todo mês?',null,'texto_longo',null,true,false,0,false),
('LID.06','lideranca','papeis','{}','{socio}',2106,'Os papéis dos sócios estão definidos e separados',null,'likert5',null,true,false,1.5,true),
('LID.07','lideranca','processos','{}','{socio}',2107,'Existe pró-labore definido, com retirada disciplinada e registrada',null,'likert5',null,true,false,1.8,true),
('LID.08','lideranca','processos','{}','{socio}',2108,'Existe acordo de sócios e contrato social atualizados',null,'likert5',null,true,false,1.5,true),
('LID.09','lideranca','comunicacao','{}','{socio,gestor}',2109,'Existem reuniões de gestão com periodicidade e registro de decisões',null,'likert5',null,true,false,1.3,true),
('LID.10','lideranca','lideranca','{}','{socio,gestor}',2110,'Decisões de investimento são tomadas com base em número, não em percepção',null,'likert5',null,true,false,1.5,true),
('LID.11','lideranca','lideranca','{}','{socio,gestor}',2111,'Se você se ausentasse por 30 dias, a operação continuaria funcionando',null,'likert5',null,true,false,2.0,true),
('LID.12','lideranca',null,'{}','{socio,gestor}',2112,'Quais decisões, hoje, só você pode tomar?',null,'texto_longo',null,true,false,0,false),
('LID.13','lideranca','pessoas','{}','{socio,gestor}',2113,'Para cada função crítica existe alguém que sabe substituir',null,'likert5',null,true,false,1.8,true),
('LID.14','lideranca',null,'{}','{socio}',2114,'A empresa tem reserva de caixa para quantos meses de operação?',null,'unica',
  '[{"valor":1,"rotulo":"Nenhuma"},{"valor":2,"rotulo":"Menos de 1 mês"},{"valor":3,"rotulo":"De 1 a 3 meses"},{"valor":4,"rotulo":"De 3 a 6 meses"},{"valor":5,"rotulo":"Mais de 6 meses"}]',
  true,false,0,true),
('LID.15','lideranca',null,'{}','{socio,gestor}',2115,'Existe pessoa cuja saída causaria dano grave imediato à operação? Quem e por quê?',null,'texto_longo',null,true,false,0,false),
('LID.16','lideranca','processos','{}','{socio,gestor}',2116,'A estrutura atual suportaria dobrar de tamanho',null,'likert5',null,true,false,1.5,true),
('LID.17','lideranca',null,'{}','{socio,gestor}',2117,'Se dobrasse o volume amanhã, o que quebraria primeiro?',null,'texto_longo',null,true,false,0,false),
('LID.18','lideranca',null,'{}','{socio,gestor}',2118,'Quais são as 3 prioridades reais dos próximos 90 dias?',null,'texto_longo',null,true,false,0,false);

-- ============ BLOCO 4 · ENCERRAMENTO ============
insert into _seed_perguntas values
('FIM.01','encerramento',null,'{}','{}',3001,'Qual seu grau de confiança nas respostas que você deu?','Responder com sinceridade aqui nos ajuda a calibrar o relatório.','unica',
  '[{"valor":"alta","rotulo":"Alta"},{"valor":"media","rotulo":"Média"},{"valor":"baixa","rotulo":"Baixa"}]',
  false,false,0,true),
('FIM.02','encerramento',null,'{}','{}',3002,'Você teria disponibilidade para uma conversa individual de 30 a 40 minutos?',null,'unica',
  '[{"valor":"sim","rotulo":"Sim"},{"valor":"talvez","rotulo":"Talvez"},{"valor":"nao","rotulo":"Não"}]',
  false,false,0,true),
('FIM.03','encerramento',null,'{}','{}',3003,'Tem algo importante que não foi perguntado e você gostaria de registrar?',null,'texto_longo',null,true,false,0,false);

-- ============ UPSERT ============
insert into public.perguntas
  (codigo, bloco, dimensao, area_scope, vinculo_scope, ordem, enunciado, ajuda,
   tipo, opcoes, permite_nao_sei, invertida, peso, obrigatoria, ativa)
-- Cast explícito: a tabela temporária guarda texto, mas `bloco` e `tipo` são enums
-- no schema, e o Postgres não converte sozinho em `insert ... select`. Efeito
-- colateral bem-vindo: bloco ou tipo inválido falha aqui, na migration, em vez de
-- entrar como dado ruim.
select codigo, bloco::pergunta_bloco, dimensao, area_scope, vinculo_scope, ordem,
       enunciado, ajuda, tipo::pergunta_tipo, opcoes, permite_nao_sei, invertida,
       peso, obrigatoria, true
from _seed_perguntas
on conflict (codigo) do update set
  bloco = excluded.bloco,
  dimensao = excluded.dimensao,
  area_scope = excluded.area_scope,
  vinculo_scope = excluded.vinculo_scope,
  ordem = excluded.ordem,
  enunciado = excluded.enunciado,
  ajuda = excluded.ajuda,
  tipo = excluded.tipo,
  opcoes = excluded.opcoes,
  permite_nao_sei = excluded.permite_nao_sei,
  invertida = excluded.invertida,
  peso = excluded.peso,
  obrigatoria = excluded.obrigatoria;

-- Desativa perguntas que saíram do seed, sem apagar (preserva respostas históricas)
update public.perguntas p
set ativa = false
where not exists (select 1 from _seed_perguntas s where s.codigo = p.codigo);

commit;

-- =====================================================================
-- DEPENDÊNCIAS CONDICIONAIS (implementar em src/domain/elegibilidade.ts)
--   D4.03  visível se D4.02 >= 4 e não for "não sei"
--   COM.04 visível se COM.03 >= 4 e não for "não sei"
--   FIN.04 visível se FIN.03 >= 4 e não for "não sei"
-- Nenhuma delas é obrigatória: pode ficar em branco, e ficar em branco é dado.
-- =====================================================================
