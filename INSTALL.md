# Instalar o Diagnóstico 360 na VPS da Hostinger

Guia escrito para quem tem **pouca experiência técnica**. Copie e cole os comandos na
ordem, um bloco de cada vez. Tempo total: ~40 minutos, boa parte esperando.

Se sua VPS for de outro provedor (Hetzner, DigitalOcean, Contabo), tudo funciona igual
— só mudam os cliques do painel nos Passos 5 e 6.

---

## Como as peças se encaixam

São **duas partes**, em lugares diferentes:

| Parte | Onde roda | O que é |
| --- | --- | --- |
| Painel (o que as pessoas abrem) | **sua VPS Hostinger**, via Docker | Arquivos estáticos servidos pelo Caddy |
| Banco, login e funções | **Supabase** | Postgres gerenciado, com backup automático |

O painel é um site estático: não há servidor seu processando nada, então a VPS quase
não trabalha. Quem guarda as respostas é o Supabase.

**Por que não colocar o banco também na VPS?** Dá para autohospedar o Supabase, mas
são oito containers, chave de criptografia para rotacionar, servidor de e-mail para
configurar e backup por sua conta. Numa VPS pequena isso vira manutenção sem fim. O
plano gratuito do Supabase cobre um diagnóstico inteiro; se um dia o cliente exigir
"os dados não saem da nossa infraestrutura", a gente reavalia — é troca de trabalho
por controle, não questão técnica.

**Ordem importa.** Faça o Supabase (Passos 2–3) e o DNS (Passo 4) **antes** de subir o
container. O certificado HTTPS só é emitido se o domínio já apontar para a VPS.

---

## Passo 1 — Colocar o código no GitHub

Sem isto o Passo 7 não tem o que clonar.

1. Abra <https://github.com/new>
2. Nome: `diagnostico-360` · visibilidade: **Private**
3. **Não** marque "Add a README file" — o repositório precisa nascer vazio
4. Crie, e envie o código:

```bash
git clone diagnostico-360.bundle diagnostico-360
cd diagnostico-360
git remote set-url origin https://github.com/brunolmonteiro1/diagnostico-360.git
git push -u origin main
```

> O GitHub vai pedir usuário e senha. A senha é um **Personal Access Token**, não a
> senha da conta: github.com → Settings → Developer settings → Personal access tokens
> → Tokens (classic) → Generate new token, com o escopo `repo` marcado.

## Passo 2 — Criar o projeto no Supabase

1. Entre em <https://supabase.com> e crie um projeto
2. Em **Region**, escolha `South America (São Paulo)` — dado de brasileiro perto de
   quem responde, e mais rápido
3. Guarde a senha do banco que ele pedir

Aguarde ~2 minutos até o projeto ficar pronto.

## Passo 3 — Criar as tabelas e as perguntas

No Supabase, menu da esquerda → **SQL Editor** → **New query**. Rode os três arquivos
**nesta ordem**, um de cada vez (cole o conteúdo, clique em **Run**, espere o "Success"):

1. `supabase/migrations/20260806000001_schema.sql` — as tabelas
2. `supabase/migrations/20260806000002_rls.sql` — as regras de segurança
3. `supabase/migrations/20260807000003_seed_perguntas.sql` — as 146 perguntas

A ordem não é detalhe: o segundo cria regras sobre as tabelas do primeiro, e o
terceiro insere dados nelas.

**Confira que deu certo.** Vá em **Table Editor**:

- Devem existir 8 tabelas, todas marcadas com **RLS enabled**. Se alguma estiver sem
  essa marca, rode o arquivo 2 de novo — sem RLS, um consultor enxergaria os clientes
  do outro.
- A tabela `perguntas` deve ter **146 linhas**.

> O terceiro arquivo é seguro de rodar de novo: ele atualiza em vez de duplicar.

## Passo 4 — Pegar as chaves

No Supabase → **Settings** (engrenagem) → **API**, copie:

- **Project URL** — algo como `https://abcdefgh.supabase.co`
- **anon public** — chave longa começando com `eyJ...`

> Existe também uma **service_role**. Ela **nunca** entra nesta instalação. Colar a
> service_role no lugar da anon faria qualquer visitante do site ler o banco inteiro.
> A anon é pública por natureza — quem protege o dado são as regras do Passo 3.

## Passo 5 — Apontar o domínio para a VPS

Primeiro pegue o IP: no **hPanel** da Hostinger → **VPS** → selecione seu servidor →
**Visão geral**. O IP aparece no topo (algo como `168.231.x.x`).

Agora o DNS. Se o domínio também é da Hostinger: **hPanel** → **Domínios** → escolha o
domínio → **DNS / Nameservers** → **Gerenciar registros DNS**. Adicione:

| Tipo | Nome | Aponta para | TTL |
| --- | --- | --- | --- |
| A | `diagnostico` | o IP da sua VPS | 300 |

Isso cria `diagnostico.seudominio.com.br`. Se o domínio estiver em outro registrador
(Registro.br, GoDaddy), faça o mesmo no painel de lá.

**Espere o DNS propagar** antes de seguir — normalmente 5 a 30 minutos. Para conferir,
do seu computador:

```bash
ping diagnostico.seudominio.com.br
```

Se responder com o IP da VPS, pode continuar. Se responder "não encontrado", espere
mais.

## Passo 6 — Entrar na VPS e instalar o Docker

A Hostinger tem terminal no navegador — você não precisa instalar nada. No **hPanel**
→ **VPS** → seu servidor → botão **Terminal do navegador**. (Se preferir SSH normal:
`ssh root@SEU-IP`, com a senha de root definida em **Configurações → Senha de root**.)

Instale o Docker:

```bash
curl -fsSL https://get.docker.com | sh
```

Confira:

```bash
docker --version
```

> **Atalho:** na Hostinger, em **SO e painel → Sistema operacional**, existe o
> template `Ubuntu 24.04 com Docker`. Se você reinstalar a VPS com ele, o Docker já
> vem pronto e este passo é desnecessário. **Reinstalar apaga tudo** que estiver na
> VPS — só faça se ela estiver vazia.

### Firewall e swap

O swap evita que a VPS trave por falta de memória durante o build:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

> **Atenção com o firewall da Hostinger.** Além do `ufw` que roda dentro da VPS, o
> hPanel tem um firewall próprio em **VPS → Configurações → Firewall**. Se você criar
> regras lá, precisa liberar as portas **22, 80 e 443** — senão o site não abre e o
> certificado HTTPS não é emitido, mesmo com o `ufw` correto. Sem nenhuma regra
> criada, o firewall da Hostinger deixa tudo passar e não há o que fazer.

## Passo 7 — Baixar e ligar

```bash
git clone https://github.com/brunolmonteiro1/diagnostico-360.git
cd diagnostico-360
```

Crie o arquivo de configuração com os valores dos Passos 4 e 5:

```bash
cat > .env.deploy <<'FIM'
APP_DOMAIN=diagnostico.seudominio.com.br
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...cole-a-chave-anon-aqui
FIM
```

(Troque os três valores pelos seus.)

Suba:

```bash
docker compose --env-file .env.deploy up -d --build
```

A primeira vez demora **3 a 8 minutos** — o Docker baixa o Node e compila o painel.
Acompanhe:

```bash
docker compose logs -f
```

Quando aparecer `→ Servindo em https://seu-dominio (certificado automático)`, está
pronto. Para sair dos logs: `Ctrl+C` — o sistema continua rodando.

## Passo 7b — Publicar as edge functions

O formulário do respondente não funciona sem elas: é por ali que passa toda leitura e
gravação de quem não tem login.

Na **sua máquina** (não na VPS), com o código do repositório:

```bash
npm i -g supabase
supabase login
supabase link --project-ref SEU-REF
supabase functions deploy responder-inicio
supabase functions deploy responder-salvar
supabase functions deploy responder-concluir
```

Não há segredo para configurar: o Supabase injeta `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` nas functions automaticamente.

Confira: `curl -X POST https://SEU-REF.supabase.co/functions/v1/responder-inicio -H "apikey: SUA-ANON-KEY" -H "Content-Type: application/json" -d '{}'`
deve responder `{"ok":false,"motivo":"token_ausente"}`. Se responder 404, a function
não foi publicada.

### Publicar automaticamente a cada push (opcional, recomendado)

O repositório traz `.github/workflows/deploy-functions.yml`, que republica as três
functions sempre que elas mudam. Para ligar, crie dois secrets no GitHub
(**Settings → Secrets and variables → Actions → New repository secret**):

| Nome | Valor |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | gere em <https://supabase.com/dashboard/account/tokens> |
| `SUPABASE_PROJECT_REF` | o ref do projeto (o trecho antes de `.supabase.co`) |

Depois disso, publicar vira `git push`.

> O workflow **não** roda `supabase db push`. As migrations foram aplicadas à mão pelo
> SQL Editor, então a tabela de controle do Supabase não tem registro delas — um
> `db push` tentaria recriar os tipos e falharia. Migration nova continua sendo passo
> manual pelo SQL Editor, até alguém rodar `supabase migration repair` para
> sincronizar o histórico.

## Passo 8 — Criar o primeiro consultor

Não existe tela de cadastro: `/app` é acesso restrito, então as contas são criadas por
você.

No Supabase → **Authentication** → **Users** → **Add user** → **Create new user**:

1. Preencha e-mail e senha
2. **Marque `Auto Confirm User`** — sem isso a pessoa não entra até confirmar por
   e-mail, e o envio de e-mail ainda não está configurado

Ainda em **Authentication** → **URL Configuration**, coloque
`https://diagnostico.seudominio.com.br` em **Site URL**.

## Passo 9 — Acessar

Abra `https://diagnostico.seudominio.com.br` e entre com o usuário do Passo 8.

Você deve cair no **Painel**. Confira que funcionou navegando em **Perguntas** — devem
aparecer as 146, agrupadas por bloco.

---

## O que já funciona e o que não

Funciona: banco com as regras de segurança, login de consultor, cadastro de clientes e
rodadas, importação de convidados com link único por pessoa, o banco de perguntas e o
acompanhamento de cobertura.

**Ainda não dá para mandar o link ao respondente.** O formulário é a Fase 4 (ver
`docs/PLANO.md`). Os tokens já são gerados e são definitivos — o que falta é a tela que
eles abrem. Até lá, esta instalação serve para você validar o ambiente e mostrar o
produto tomando forma.

---

## Operações do dia a dia

### Atualizar quando houver versão nova

```bash
cd diagnostico-360
git pull
docker compose --env-file .env.deploy up -d --build
```

### Trocar uma chave do Supabase

Edite o `.env.deploy` e rode:

```bash
docker compose --env-file .env.deploy up -d
```

Sem `--build`: as chaves são lidas a cada boot, não ficam presas dentro da imagem.

### Parar, reiniciar, ver estado

```bash
docker compose stop
docker compose start
docker compose restart
docker compose ps
```

### Backup

O que importa está no Supabase, que já faz backup automático (**Database → Backups**).
Na VPS não há dado seu — só os arquivos do site e os certificados. Se precisar recriar
a VPS do zero, basta repetir este guia.

---

## Problemas comuns

| Sintoma | O que fazer |
| --- | --- |
| Página não abre | `docker compose logs --tail 50` e leia a última mensagem |
| "Configuração de ambiente inválida" na tela | Falta `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` no `.env.deploy`; corrija e rode `docker compose --env-file .env.deploy up -d` |
| Site abre em HTTP, sem cadeado | `APP_DOMAIN` vazio no `.env.deploy`, ou o DNS ainda não aponta para a VPS |
| Erro de certificado, ou fica tentando emitir | O DNS precisa apontar para a VPS **antes** de subir. Confira com `ping`, e confira o firewall da Hostinger (portas 80 e 443) |
| Login não entra e a senha está certa | O usuário foi criado sem `Auto Confirm User`. Apague e recrie marcando a opção |
| Painel abre mas "Perguntas" está vazio | O arquivo 3 do Passo 3 não rodou. Rode de novo — ele não duplica |
| Erro de permissão ao listar clientes | As regras do Passo 3 (arquivo 2) não foram aplicadas |
| Build morre no meio, sem mensagem clara | Falta memória. Confira o swap do Passo 6 com `swapon --show` |
| Porta 80 ocupada | `docker compose down` de outro projeto que use a porta |
| Recarreguei uma página e deu 404 | Não deveria acontecer. Se acontecer: `docker compose up -d --build` |
| VPS sem espaço | `docker system prune -f` remove sobras de builds antigos |

---

## Segurança — o que não fazer

- **Não siga a dica que o PostgREST dá numa mensagem de erro.** Quando algo é negado,
  ele sugere `GRANT SELECT ON public.clientes TO anon;`. Rodar isso abre o banco
  inteiro para qualquer visitante do site — é exatamente o que a instalação impede.
  Permissão negada para `anon` é o comportamento correto, não um defeito.
- **Não** coloque a `service_role` do Supabase no `.env.deploy` nem em nenhuma
  variável `VITE_`. Tudo com esse prefixo vai para o navegador de qualquer visitante.
- **Não** desligue a RLS para "resolver" um problema de permissão. Ela é o que impede
  um consultor de ler os clientes do outro.
- **Não** deixe `APP_DOMAIN` vazio em produção: sem HTTPS, a senha do consultor
  trafega em texto puro.
- **Não** versione o `.env.deploy` — ele já está no `.gitignore`.
