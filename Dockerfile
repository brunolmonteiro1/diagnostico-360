# Diagnóstico 360 — Ethos Lab
#
# Dois estágios: o Node compila, o Caddy serve. A imagem final não tem Node,
# npm nem node_modules — só os arquivos estáticos e o servidor. Isso deixa a
# imagem pequena e reduz a superfície exposta na VPS.
#
# Instalação: veja INSTALL.md.

# ---------------------------------------------------------------------------
# Estágio 1 — build
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Dependências primeiro: camada cacheável, só refaz quando o lock muda.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# As URLs do Supabase NÃO entram aqui. Num app Vite, tudo que existe no build
# fica congelado dentro do JavaScript — trocar a chave exigiria recompilar.
# Elas são injetadas em tempo de execução pelo docker-entrypoint.sh.
RUN npm run build

# ---------------------------------------------------------------------------
# Estágio 2 — runtime
# ---------------------------------------------------------------------------
FROM caddy:2-alpine

COPY --from=build /app/dist /srv
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80 443

CMD ["/docker-entrypoint.sh"]
