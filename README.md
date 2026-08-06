# Diagnóstico 360 — Ethos Lab

Ferramenta de consultoria organizacional multi-empresa. Coleta a percepção de todos os
níveis de uma empresa (sócios, gestores, colaboradores, terceirizados) sobre as áreas
do negócio e gera um relatório de diagnóstico consolidado.

## Princípio central

Toda pergunta objetiva tem a opção explícita **"Não sei / Não tenho visibilidade sobre
isso"**. Ninguém é obrigado a chutar.

Um "não sei" nunca vira nota baixa e nunca entra na média de maturidade — ele alimenta
uma métrica separada, o **Índice de Visibilidade**. Se o financeiro não sabe se existe
DRE, isso não é maturidade baixa; é falta de visibilidade, que é outra coisa. Misturar
as duas destrói o diagnóstico.

## Stack

React 19 · TypeScript · Vite · Tailwind v4 · shadcn/ui · Supabase (Postgres, Auth,
RLS, Edge Functions) · react-router-dom · react-hook-form + zod · recharts · date-fns ·
Vitest + Testing Library · Playwright

## Começando

```bash
npm install
cp .env.local.example .env.local   # preencha com os valores do seu projeto Supabase
npm run dev
```

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (`tsc -b && vite build`) |
| `npm run preview` | Serve o build |
| `npm run test` | Testes unitários e de integração (Vitest) |
| `npm run test:watch` | Vitest em modo watch |
| `npm run test:db` | Testes de RLS e constraints, em SQL, contra um Postgres descartável |
| `npm run e2e` | Testes end-to-end (Playwright) |
| `npm run gen:types` | Regera `src/lib/database.types.ts` a partir do schema |
| `npm run lint` | Lint (oxlint) |

### Testes de banco

Provam o isolamento entre consultores, que é a garantia central do produto. Precisam
de um Postgres descartável — o banco é recriado do zero a cada execução:

```bash
TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5433/postgres npm run test:db
```

Sem `TEST_DATABASE_URL` o script sai com código 2 e explica o que falta.

## Estado do projeto

Fases 0 e 1 concluídas: migrations com RLS, tipos gerados do schema, autenticação de
consultor e rota protegida `/app`. As fases 2 a 6 estão descritas em
[`docs/PLANO.md`](docs/PLANO.md).

Nenhum projeto Supabase está conectado — ver
[`supabase/README.md`](supabase/README.md). As migrations rodam contra qualquer
Postgres com o shim de `tests/db/00-auth-shim.sql`.

## Deploy

Painel na sua VPS via Docker (Caddy servindo os arquivos estáticos, com HTTPS
automático); banco, login e edge functions no Supabase. Passo a passo completo em
[`INSTALL.md`](INSTALL.md). Resumo:

```bash
git clone https://github.com/brunolmonteiro1/diagnostico-360.git
cd diagnostico-360
cat > .env.deploy <<'FIM'
APP_DOMAIN=diagnostico.seudominio.com.br
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
FIM
docker compose --env-file .env.deploy up -d --build
```

As chaves são injetadas **em tempo de execução** (`docker-entrypoint.sh` escreve
`env-config.js` a cada boot), não no build. Trocar de projeto Supabase é editar o
`.env.deploy` e subir de novo, sem recompilar.

## Segredos

`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são públicos e vão ao bundle. Qualquer
variável com prefixo `VITE_` é embutida no JavaScript servido ao navegador.

`SUPABASE_SERVICE_ROLE_KEY` e chaves de API de IA ficam **apenas** nos secrets das
edge functions — nunca em código do frontend, nunca em `.env` versionado.

## Documentação

- [`CLAUDE.md`](CLAUDE.md) — especificação do produto e regras de trabalho (a lei)
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — camadas, fluxo de dados, decisões e pendências
- [`docs/PLANO.md`](docs/PLANO.md) — as 6 fases, critérios de pronto e testes
