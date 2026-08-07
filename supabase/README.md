# supabase/

Estrutura preparada na Sessão 1. **Nenhum projeto Supabase real está conectado ainda.**

- `migrations/` — schema versionado. As tabelas e políticas de RLS descritas no
  `CLAUDE.md` entram aqui na **Fase 1**.
- `functions/` — edge functions (Deno). Previstas: `responder-inicio`,
  `responder-salvar`, `responder-concluir` (Fase 4), `calcular-scores` (Fase 5),
  `gerar-relatorio` (Fase 6).

## Antes da Fase 1

O `config.toml` é gerado pela CLI, que ainda não foi executada neste repositório:

```bash
npm i -g supabase   # ou brew install supabase/tap/supabase
supabase init
supabase link --project-ref <ref-do-projeto>
```

Depois copie `.env.local.example` para `.env.local` e preencha `VITE_SUPABASE_URL`
e `VITE_SUPABASE_ANON_KEY`.

## Regra de segredos

`SUPABASE_SERVICE_ROLE_KEY` e chaves de IA **nunca** entram em código do frontend
nem em variável com prefixo `VITE_` — só em `supabase secrets set`. Toda leitura e
gravação do respondente passa por edge function com service role que valida o token;
as tabelas de resposta nunca são expostas ao client sem autenticação.

## Secrets da Fase 6 — `gerar-relatorio`

```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-...
# Opcional — sem isto, usa o padrão em supabase/functions/_shared/openrouter.ts
# (MODELO_RELATORIO_PADRAO, hoje "anthropic/claude-sonnet-4.5").
supabase secrets set OPENROUTER_REPORT_MODEL=anthropic/claude-sonnet-4.5
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetadas automaticamente pelo
runtime de edge functions — não precisam de `secrets set`.
