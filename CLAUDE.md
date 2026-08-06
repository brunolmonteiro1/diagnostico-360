# Diagnóstico 360 — Ethos Lab

Ferramenta de consultoria organizacional multi-empresa. Coleta percepção de todos os
níveis de uma empresa e gera relatório de diagnóstico consolidado.

## Princípio central do produto

Toda pergunta objetiva tem a opção explícita "Não sei / Não tenho visibilidade sobre
isso". Ninguém é obrigado a chutar.

Um "não sei" NUNCA vira nota baixa e NUNCA entra na média de maturidade. Ele alimenta
uma métrica separada, o Índice de Visibilidade. Se o financeiro não sabe se existe DRE,
isso não é maturidade baixa — é falta de visibilidade, que é outra coisa. Misturar as
duas destrói o diagnóstico.

A mesma regra vale para a IA que redige o relatório: ela só afirma o que os dados
sustentam e escreve "dado insuficiente" quando a cobertura é baixa.

Se em algum momento uma implementação sua contrariar este princípio, pare e me avise.

## Stack

- React 19 + TypeScript + Vite
- Tailwind + shadcn/ui
- Supabase: Postgres, Auth, RLS, Edge Functions (Deno)
- react-router-dom · react-hook-form + zod · recharts · date-fns
- Vitest + Testing Library (unit/integração) · Playwright (e2e do caminho crítico)

## Arquitetura de acesso

Dois tipos de usuário, com caminhos completamente separados:

**Consultor** — login e-mail/senha, painel em `/app`. RLS garante que cada consultor só
enxerga registros que descendem de um cliente com `owner_id = auth.uid()`.

**Respondente** — NÃO faz login. Acessa por `/responder/:token`. Toda leitura e gravação
passa por edge functions com service role que validam o token. As tabelas de resposta
nunca são expostas ao client sem autenticação. O token é a credencial.

## Estrutura de pastas

```
src/
  app/            rotas e telas do consultor (protegidas)
  responder/      fluxo público do respondente
  components/     ui/ (shadcn) e compartilhados
  lib/            supabase client, tipos gerados, utils
  domain/         regras puras: scoring, elegibilidade, agregação — SEM I/O
  hooks/
supabase/
  migrations/
  functions/      responder-inicio, responder-salvar, responder-concluir,
                  calcular-scores, gerar-relatorio
docs/
```

`src/domain/` é a camada mais importante para testes: funções puras, sem Supabase,
sem React. Todo o motor de cálculo mora ali e é testado isoladamente.

## Modelo de dados

profiles(id=auth.users, nome, email, role, created_at)
clientes(id, owner_id→profiles, nome_fantasia, razao_social, cnpj, segmento, porte,
         n_colaboradores, logo_url, observacoes, created_at)
rodadas(id, cliente_id, titulo, status[rascunho|aberta|encerrada|arquivada],
        anonima bool, modulos_ativos text[], abertura_em, prazo_em,
        mensagem_abertura, created_at)
convites(id, rodada_id, token unique default encode(gen_random_bytes(16),'hex'),
         email, nome_sugerido, enviado_em, aberto_em, lembretes_enviados, created_at)
respondentes(id, rodada_id, convite_id, nome, email, cargo, area_principal,
             areas_secundarias text[], vinculo[socio|gestor|colaborador|terceirizado|
             estagiario|franqueadora], tempo_empresa, reporta_para, n_liderados,
             consentimento_lgpd bool, status[em_andamento|concluido], iniciado_em,
             concluido_em, duracao_segundos, autoavaliacao_confianca)
perguntas(id, codigo unique, bloco[identificacao|universal|area|lideranca|encerramento],
          dimensao, area_scope text[], vinculo_scope text[], ordem, enunciado, ajuda,
          tipo[likert5|frequencia5|escala0a10|unica|multipla|texto_curto|texto_longo|
          numero], opcoes jsonb, permite_nao_sei bool, invertida bool, peso, obrigatoria,
          ativa)
respostas(id, respondente_id, pergunta_id, nao_sei bool, valor_num, valor_texto,
          valor_opcoes text[], respondido_em, UNIQUE(respondente_id, pergunta_id))
relatorios(id, rodada_id, versao, scores jsonb, narrativa jsonb, editado_manualmente,
           narrativa_editada jsonb, gerado_em, gerado_por)

Constraint obrigatória:
  ALTER TABLE respostas ADD CONSTRAINT chk_nao_sei
  CHECK (NOT nao_sei OR (valor_num IS NULL AND valor_texto IS NULL
         AND valor_opcoes IS NULL));

Escopo vazio significa "todos": `area_scope = '{}'` aparece para todas as áreas.

## Motor de cálculo (src/domain/scoring.ts — funções puras)

Normalização por item válido (nao_sei = false):
  v = valor_num; se invertida: v = 6 - v; score = ((v - 1) / 4) * 100

maturidade      = Σ(score × peso) / Σ(peso)      — SOMENTE respostas válidas
visibilidade    = respostas_validas / respostas_aplicaveis × 100
dispersao       = desvio-padrão dos scores
gap_hierarquico = média(socio,gestor) − média(colaborador)
enps            = %(9-10) − %(0-6), suprimir se n < 5

REGRAS DURAS, cada uma com teste próprio:
- nao_sei = true nunca entra na maturidade, só na visibilidade
- visibilidade < 40% → confiavel = false e NENHUMA nota de maturidade é emitida, em
  tela alguma nem no PDF
- recorte com n < 3 nunca é exibido — sustenta a promessa de sigilo da tela de abertura

## Design — conceito "blueprint" (planta técnica)

Não pode parecer um Google Forms. Se parecer amador, as pessoas respondem de qualquer
jeito e o dado não presta.

Tokens:
  --bg-dark: #0F1115    --bg-light: #F4F4F2    --accent: #D97706
  --critico: #B91C1C    --atencao: #D97706     --saudavel: #15803D
  --sem-dado: #64748B   (cinza — nunca vermelho; ausência de dado não é erro)

Títulos em Oswald, corpo em Inter, escala 1.25x, muito respiro.
Fundo claro com grade de pontos: radial-gradient(circle, #00000010 1px, transparent 1px)
a 32px. Numeração da seção em número grande a 5% de opacidade atrás do título.
Card de pergunta ativo com borda esquerda de 3px em âmbar.

PROIBIDO: azul genérico em botão, gradiente roxo-azul, card padrão border-radius 8px +
box-shadow default, ilustração de equipe sorrindo, emoji em título.

## Fases

1. Fundação — migrations, RLS, tipos, auth de consultor, rota protegida
2. Clientes e rodadas — CRUD, módulos por rodada, estados, convites e tokens
3. Banco de perguntas — seed + tela de gestão
4. Formulário do respondente — edge functions, fluxo de 7 telas, autosave
5. Motor de cálculo — domain puro + testes + cockpit de acompanhamento
6. Relatório — gerar-relatorio, gráficos, editor, exportação PDF

Uma fase por sessão. Ao final de cada uma: testes passando, `npm run build` limpo,
commit com mensagem convencional.

## Regras de trabalho

- Não instale dependência nova sem me perguntar.
- Não invente coluna, campo ou rota que não esteja aqui.
- Toda regra do motor de cálculo precisa de teste antes da implementação.
- Nunca coloque SERVICE_ROLE_KEY ou chave de IA em código que vá para o bundle.
- Nunca envie resposta individual identificada para a IA — só agregados.
- Quando uma decisão não estiver especificada, pergunte. Não escolha por mim.
