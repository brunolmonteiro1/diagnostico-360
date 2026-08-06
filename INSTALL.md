# Como instalar o Diagnóstico 360 na sua VPS (passo a passo)

Guia escrito para quem tem **pouca experiência técnica**. Copie e cole os comandos na
ordem, um bloco de cada vez. Tempo total: ~30 minutos, sendo metade esperando.

O que você precisa:

- Uma VPS com Linux (Ubuntu 22.04 ou mais novo) e pelo menos 1 GB de RAM;
- O usuário e a senha (ou chave) para acessar a VPS por SSH;
- Um domínio ou subdomínio (ex.: `diagnostico.ethoslab.com.br`) — sem ele não há
  HTTPS, e o login trafegaria sem criptografia;
- Uma conta gratuita no [Supabase](https://supabase.com).

---

## Como as peças se encaixam

Diferente de outros projetos seus, aqui são **duas partes**:

| Parte | Onde roda | O que é |
| --- | --- | --- |
| Painel (o que as pessoas abrem) | **sua VPS**, via Docker | Arquivos estáticos servidos pelo Caddy |
| Banco, login e funções | **Supabase** | Postgres gerenciado, com backup automático |

O painel é um site estático: não tem servidor seu processando nada, então a VPS quase
não trabalha. Quem guarda as respostas é o Supabase.

**Por que não colocar o banco também na VPS?** Dá para autohospedar o Supabase, mas
são oito containers, chave de criptografia para rotacionar, servidor de e-mail para
configurar e backup por sua conta. Numa VPS pequena isso vira manutenção sem fim. O
plano gratuito do Supabase já cobre um diagnóstico inteiro; se um dia a exigência do
cliente for "os dados não saem da nossa infraestrutura", a gente reavalia — é uma
troca de trabalho por controle, não uma questão técnica.

---

## Passo 1 — Criar o projeto no Supabase

1. Entre em [supabase.com](https://supabase.com) e crie um projeto.
2. Em **Region**, escolha `South America (São Paulo)` — dado de brasileiro perto de
   quem responde, e mais rápido.
3. Guarde a senha do banco que ele pedir. Você vai precisar dela um dia.

Aguarde uns 2 minutos até o projeto ficar pronto.

## Passo 2 — Criar as tabelas

No painel do Supabase, abra **SQL Editor** (menu da esquerda) e:

1. Abra o arquivo `supabase/migrations/20260806000001_schema.sql` deste projeto,
   copie **todo** o conteúdo, cole no editor e clique em **Run**.
2. Faça o mesmo com `supabase/migrations/20260806000002_rls.sql`.

A ordem importa: o segundo arquivo cria as regras de segurança sobre as tabelas que o
primeiro criou.

> Se você tiver o Supabase CLI instalado, o equivalente é
> `supabase link --project-ref SEU-REF && supabase db push`.

**Confira que deu certo:** vá em **Table Editor**. Devem aparecer oito tabelas
(`profiles`, `clientes`, `rodadas`, `convites`, `respondentes`, `perguntas`,
`respostas`, `relatorios`), todas marcadas com **RLS enabled**. Se alguma estiver sem
essa marca, pare e rode o segundo arquivo de novo — sem RLS, um consultor enxergaria
os clientes do outro.

## Passo 3 — Pegar as chaves

Ainda no Supabase, vá em **Settings → API** e copie:

- **Project URL** — algo como `https://abcdefgh.supabase.co`
- **anon public** — uma chave longa começando com `eyJ...`

> Existe também uma **service_role**. Ela **nunca** entra nesta instalação. Se você
> colar a service_role no lugar da anon, qualquer visitante do site passa a ler o
> banco inteiro. A anon é pública por natureza — quem protege o dado são as regras
> de RLS que você criou no Passo 2.

## Passo 4 — Apontar o domínio

No painel do seu provedor de domínio, crie um registro:

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | `diagnostico` (ou o subdomínio que quiser) | o IP da sua VPS |

Faça isso **antes** do Passo 7: o certificado HTTPS só é emitido se o domínio já
apontar para a VPS.

## Passo 5 — Entrar na VPS e instalar o Docker

```bash
ssh root@IP-DA-SUA-VPS
```

Instale o Docker (só na primeira vez):

```bash
curl -fsSL https://get.docker.com | sh
```

Confira:

```bash
docker --version
```

### Recomendado: firewall e swap

O firewall fecha tudo menos o necessário. O swap evita que a VPS trave por falta de
memória durante o build:

```bash
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable

fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## Passo 6 — Baixar o projeto

```bash
git clone https://github.com/brunolmonteiro1/diagnostico-360.git
cd diagnostico-360
```

> Se o repositório for privado, o GitHub pede usuário e senha — use um Personal
> Access Token como senha (github.com → Settings → Developer settings → Personal
> access tokens).

## Passo 7 — Configurar e ligar

Crie o arquivo de configuração com os valores dos Passos 3 e 4:

```bash
cat > .env.deploy <<'FIM'
APP_DOMAIN=diagnostico.ethoslab.com.br
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
pronto. (Para sair dos logs: `Ctrl+C` — o sistema continua rodando.)

## Passo 8 — Criar o primeiro consultor

Não existe tela de cadastro: `/app` é acesso restrito, então as contas são criadas
por você.

No Supabase, vá em **Authentication → Users → Add user**:

1. Preencha e-mail e senha;
2. **Marque `Auto Confirm User`** — sem isso a pessoa não consegue entrar até
   confirmar por e-mail, e o envio de e-mail ainda não está configurado.

Ainda em **Authentication → URL Configuration**, coloque `https://seu-dominio` em
**Site URL**.

## Passo 9 — Acessar

Abra `https://diagnostico.ethoslab.com.br` e entre com o usuário do Passo 8.

Você deve cair no **Painel**. Se aparecer a tela de login de novo, a senha está
errada; se aparecer erro de configuração, revise o `.env.deploy`.

---

## O que já funciona e o que não

Hoje o sistema tem a **fundação**: banco com as regras de segurança, login de
consultor e o painel protegido.

**Ainda não dá para mandar link para respondente.** O questionário é a Fase 4 (ver
`docs/PLANO.md`). Até lá, esta instalação serve para você validar o ambiente e
mostrar o produto tomando forma.

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

### Parar / reiniciar / ver estado

```bash
docker compose stop
docker compose start
docker compose restart
docker compose ps
```

### Backup

O que importa está no Supabase, que já faz backup automático. Na VPS não há dado
seu — só os arquivos do site e os certificados. Se precisar recriar a VPS do zero,
basta repetir este guia.

Para um backup manual do banco, no Supabase: **Database → Backups**.

---

## Problemas comuns

| Sintoma | O que fazer |
| --- | --- |
| Página não abre | `docker compose logs --tail 50` e leia a última mensagem |
| "Configuração de ambiente inválida" na tela | Falta `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` no `.env.deploy`; corrija e rode `docker compose --env-file .env.deploy up -d` |
| Site abre em HTTP, sem cadeado | `APP_DOMAIN` vazio no `.env.deploy`, ou o DNS ainda não aponta para a VPS. Confira com `ping seu-dominio` |
| Erro de certificado | O DNS precisa apontar para a VPS **antes** de subir. Corrija o DNS, espere alguns minutos e rode `docker compose restart` |
| Login não entra e a senha está certa | O usuário foi criado sem `Auto Confirm User`. No Supabase, apague e recrie marcando a opção |
| Porta 80 ocupada | `docker compose down` de outro projeto que use a porta, ou coloque este atrás do Caddy que já existe na VPS |
| Recarreguei uma página e deu 404 | Não deveria acontecer — o Caddy devolve o `index.html` em qualquer rota. Se acontecer, o build saiu errado: `docker compose up -d --build` |
| VPS ficou sem espaço | `docker system prune -f` remove sobras de builds antigos |

---

## Segurança — o que não fazer

- **Não** coloque a `service_role` do Supabase no `.env.deploy` nem em nenhuma
  variável `VITE_`. Tudo com esse prefixo vai para o navegador de qualquer visitante.
- **Não** desligue a RLS para "resolver" um problema de permissão. Ela é o que impede
  um consultor de ler os clientes do outro.
- **Não** deixe `APP_DOMAIN` vazio em produção: sem HTTPS, a senha do consultor
  trafega em texto puro.
