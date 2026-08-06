# Plano de execução — Diagnóstico 360

Seis fases, **uma por sessão**. Cada fase só está pronta quando os testes passam,
`npm run build` está limpo e existe commit com mensagem convencional.

O plano é derivado do `CLAUDE.md`. Onde uma fase depender de decisão que ainda não
existe, a pendência está registrada em `docs/ARQUITETURA.md` §11 — a regra do projeto
é perguntar, não preencher a lacuna com o padrão mais provável.

## Estado atual

| Fase | Estado |
| --- | --- |
| 0 · Fundação do repositório | **concluída** |
| 1 · Fundação | não iniciada |
| 2 · Clientes e rodadas | não iniciada |
| 3 · Banco de perguntas | não iniciada |
| 4 · Formulário do respondente | não iniciada |
| 5 · Motor de cálculo | não iniciada |
| 6 · Relatório | não iniciada |

---

## Fase 0 — Fundação do repositório (concluída)

**Escopo.** Scaffold Vite + React 19 + TypeScript; dependências do `CLAUDE.md`;
Tailwind v4 com os tokens do conceito blueprint; shadcn/ui; Vitest + Testing Library
com jsdom; estrutura de pastas de `src/` e `supabase/`; `CLAUDE.md`,
`docs/ARQUITETURA.md` e este plano.

**Pronto quando.** `npm run test` e `npm run build` limpos; os tokens do `CLAUDE.md`
presentes no CSS compilado; nenhum segredo versionado.

**Testes que provam.** `src/App.test.tsx` renderiza a casca — valida a cadeia Vitest +
Testing Library + jsdom + alias `@/`. Inspeção do `dist/` confirmou os seis tokens de
cor, Inter e Oswald, e a ausência da fonte Geist que o `shadcn init` havia instalado.

**Não incluído.** Nenhum projeto Supabase real está conectado; `supabase/` tem só a
estrutura e um README com os passos da CLI.

---

## Fase 1 — Fundação

**Escopo.** Migrations completas com RLS para as sete tabelas do `CLAUDE.md`
(`profiles`, `clientes`, `rodadas`, `convites`, `respondentes`, `perguntas`,
`respostas`, `relatorios`), incluindo a constraint `chk_nao_sei`. Geração dos tipos
TypeScript a partir do schema. Autenticação de consultor por e-mail/senha. Rota
protegida `/app` com layout base.

**Pronto quando.** As migrations sobem do zero num banco limpo; os tipos gerados
compilam; um consultor não autenticado é barrado em `/app`; e o teste de RLS abaixo
passa.

**Testes que provam.**

- **Isolamento por RLS (obrigatório, bloqueia a fase).** Criar dois consultores em
  ambiente de teste e provar que um não lê os clientes do outro. Sem esse teste
  passando, a fase não está pronta.
- A constraint `chk_nao_sei` rejeita uma linha com `nao_sei = true` e `valor_num`
  preenchido.
- Rota protegida redireciona sem sessão e renderiza com sessão.

**Cuidado.** O isolamento é do banco, não do frontend. O teste precisa exercitar a
política com a anon key, do jeito que um cliente qualquer exercitaria.

---

## Fase 2 — Clientes e rodadas

**Escopo.** CRUD de clientes e de rodadas. Na criação da rodada o consultor escolhe os
módulos de área ativos (`modulos_ativos`), define `prazo_em` e escreve a
`mensagem_abertura` que o respondente verá. Estados da rodada: `rascunho → aberta →
encerrada` (com `arquivada` previsto no modelo). Importação de respondentes por
colagem de e-mails ou CSV, com geração de token e link único por pessoa.

**Pronto quando.** Uma rodada vai de rascunho a encerrada pela UI; a importação gera
um token único por pessoa; e cada link resolve para um respondente distinto.

**Testes que provam.**

- Transições de estado válidas são aceitas e inválidas são recusadas.
- Importação por colagem e por CSV produz N convites com N tokens distintos, e
  e-mail repetido não gera convite duplicado.
- Um cliente criado pelo consultor A não aparece na lista do consultor B (regressão
  do RLS da Fase 1, agora pela UI).

**Decisão pendente.** Envio de e-mail dos convites — ver `ARQUITETURA.md` §11.3.

---

## Fase 3 — Banco de perguntas

**Escopo.** Seed do banco de perguntas via migration **idempotente**: rodar duas vezes
não duplica. Depois, a tela `/app/perguntas` para visualizar, ativar/desativar e
editar, agrupada por bloco e dimensão.

**Pronto quando.** A migration roda duas vezes seguidas e a contagem de perguntas não
muda; a tela agrupa por bloco e dimensão; ativar/desativar persiste.

**Testes que provam.**

- Idempotência: aplicar o seed duas vezes mantém a mesma contagem e os mesmos
  `codigo` únicos.
- Toda pergunta objetiva do seed tem `permite_nao_sei = true` — é o princípio central
  do produto virando invariante de dados, verificada no seed e não só na UI.
- Perguntas invertidas estão marcadas com `invertida = true` (a Fase 5 depende disso).

**Entrada necessária.** O conteúdo das perguntas vem de fora (seção 7 do blueprint) e
precisa ser fornecido no início da sessão desta fase.

---

## Fase 4 — Formulário do respondente

A fase mais delicada. Nenhum requisito abaixo é opcional.

**Escopo.** Fluxo público `/responder/:token` com sete telas: abertura,
identificação, bloco universal (6 dimensões, uma por tela), bloco de área
condicional, bloco de liderança condicional, encerramento e conclusão. Edge functions
`responder-inicio(token)`, `responder-salvar(token, pergunta_id, payload)` e
`responder-concluir(token)`, com rate limit de 60 req/min por token.

**Requisitos críticos.**

1. Toda pergunta objetiva renderiza, abaixo de uma linha divisória e **fora** da
   escala numérica, a opção "Não sei / Não tenho visibilidade sobre isso" em
   `--sem-dado`. Ela nunca pode parecer um valor intermediário da escala. Marcá-la
   grava `nao_sei = true` e limpa `valor_num`, `valor_texto` e `valor_opcoes`.
2. Perguntas abertas **não** têm validação de tamanho mínimo. "Não sei" é resposta
   válida.
3. Autosave a cada resposta. Fechar o navegador e reabrir o mesmo link retoma no ponto
   exato, com tudo preservado.
4. Roteamento condicional em `src/domain/elegibilidade.ts`, puro e testado: bloco de
   área vem de `ID.04`; bloco de liderança só se `ID.06 ∈ {socio, gestor}`;
   follow-ups (`D4.03`, `COM.04`, `FIN.04`) só se a anterior foi positiva.
5. Progresso calculado sobre as perguntas **aplicáveis ao perfil**, nunca sobre o
   total.
6. Mobile-first: alvos de 44px, Likert empilhada no mobile e em linha no desktop, sem
   rolagem horizontal em nenhuma tela.

Token inválido, expirado ou de rodada encerrada retorna tela explicativa amigável,
nunca erro 500.

**Texto obrigatório da tela de abertura.** Usar literalmente o texto do prompt da
fase, incluindo as três observações numeradas — ele é a promessa de sigilo que a
supressão por `n < 3` sustenta depois.

**Pronto quando.** O e2e de retomada passa e nenhum requisito crítico está pendente.

**Testes que provam.**

- **E2E obrigatório (Playwright).** Percorrer o formulário inteiro como colaborador do
  financeiro, fechar o navegador no meio, reabrir pelo mesmo link e confirmar a
  retomada.
- Unitários de `elegibilidade.ts`: colaborador não recebe o bloco de liderança; sócio
  recebe; follow-up só aparece após resposta positiva; `area_scope = '{}'` aparece
  para todas as áreas.
- Marcar "Não sei" grava `nao_sei = true` e zera os três campos de valor.
- Progresso de um colaborador chega a 100% sem o bloco de liderança.
- Token inválido, expirado e de rodada encerrada renderizam tela amigável.

---

## Fase 5 — Motor de cálculo

**Em TDD estrito: os testes vêm antes da implementação.**

**Escopo.** `src/domain/scoring.ts` puro. Depois a edge function `calcular-scores`,
que apenas orquestra — a regra fica no domain. Por fim a tela `/app/rodadas/:id` com
taxa de resposta ao vivo quebrada **por área e por vínculo**, não só o total.

**Pronto quando.** Os testes abaixo passam e o cockpit mostra a quebra por recorte.

**Testes que provam (escrever primeiro, no mínimo).**

- Resposta com `nao_sei` não altera a maturidade, mas reduz a visibilidade.
- Pergunta invertida é espelhada (`6 - v`) antes de pontuar.
- `visibilidade < 40%` retorna `confiavel = false` e maturidade nula.
- Recorte com `n < 3` retorna `suprimido = true`.
- Gap hierárquico com zero colaboradores não quebra e retorna nulo.
- eNPS com `n < 5` é suprimido.

**Por que a quebra por recorte é critério de pronto.** 80% de resposta geral com 0% do
financeiro é diagnóstico inválido, e o consultor precisa ver isso **antes** de
encerrar a rodada — depois de encerrada, não há o que corrigir.

---

## Fase 6 — Relatório

**Escopo.** Edge function `gerar-relatorio`, que monta payload **somente com dados
agregados** — nunca resposta individual identificada, nunca nome próprio — e chama a
API do modelo com o prompt de sistema definido no prompt da fase, temperatura 0.3 e
saída em JSON estrito.

Schema de saída: `sumario_executivo[]`, `diagnostico_por_dimensao[]`,
`achados_por_area[]`, `gargalos[]`, `riscos_criticos[]`, `o_que_funciona[]`,
`iniciativas[]`, `lacunas_do_diagnostico[]`.

Tela `/app/rodadas/:id/relatorio` com recharts: radar das 6 dimensões em 3 séries
(geral, liderança, equipe), barras do Índice de Visibilidade, barras divergentes do
gap hierárquico ordenadas pelo maior gap, mapa de calor áreas × dimensões com células
em `--sem-dado` onde há supressão, narrativa da IA em blocos editáveis pelo consultor,
e rota `/relatorio/:id/print` com CSS `@media print`.

**Pronto quando.** O consultor consegue revisar e editar antes de exportar. **Nunca
entregar saída de IA direto ao cliente.**

**Testes que provam.**

- O payload enviado ao modelo não contém nome próprio nem resposta individual
  identificada — teste sobre o payload montado, não sobre a resposta do modelo.
- Rodada de teste com 2 respondentes produz "dado insuficiente" e nenhuma nota de
  maturidade.
- Dimensão com visibilidade < 40% não exibe nota em tela nem na rota de impressão.
- Células suprimidas no mapa de calor saem em `--sem-dado`, nunca em vermelho.
- A narrativa editada pelo consultor persiste em `narrativa_editada` e é a que vai
  para a impressão.

**Decisão pendente.** Provedor e modelo de IA — ver `ARQUITETURA.md` §11.4.

---

## Checklist de pronto do produto

Vale para o conjunto, não para uma fase isolada.

- [ ] `npm run test` e `npm run build` limpos
- [ ] Marcar "Não sei" grava `nao_sei = true` e não altera a maturidade — teste no domain
- [ ] Dimensão com visibilidade < 40% não exibe nota em tela nem no PDF
- [ ] Recorte com `n < 3` nunca aparece
- [ ] E2E de retomada passando
- [ ] Bloco de liderança não aparece para colaborador
- [ ] Formulário completo no celular, sem rolagem horizontal
- [ ] Token inválido mostra tela amigável, não 500
- [ ] `grep -r "service_role\|sk-\|anthropic" src/` não retorna nada
- [ ] Consultor A não lê clientes do consultor B — teste automatizado
- [ ] Relatório escreve "dado insuficiente" em rodada de teste com 2 respondentes
- [ ] Nenhum nome próprio das abertas aparece na narrativa
- [ ] Sem azul genérico em CTA, sem gradiente roxo-azul
