#!/bin/sh
# Gera a configuração de execução e sobe o Caddy.
#
# Um app Vite é compilado uma vez e servido como arquivo estático: qualquer
# variável lida durante o build fica congelada dentro do JavaScript. Para que
# trocar a chave do Supabase não exija recompilar a imagem, os valores são
# escritos aqui, a cada boot, num arquivo que o index.html carrega antes do app.
#
# Consequência prática: mudou o .env.deploy? `docker compose up -d` basta.
set -e

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "!! VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão definidas."
  echo "   O painel vai abrir e mostrar erro de configuração no lugar do login."
  echo "   Preencha o .env.deploy (veja INSTALL.md, Passo 7) e rode de novo."
fi

# Só chave pública entra aqui. A SERVICE_ROLE_KEY e as chaves de IA vivem nos
# secrets das edge functions e nunca são servidas ao navegador.
cat > /srv/env-config.js <<EOF
window.__ENV__ = {
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY}"
};
EOF

# ---------------------------------------------------------------------------
# Endereço do site
#
# O Caddy espera um NOME DE HOST puro para emitir certificado. É fácil colar
# uma URL inteira aqui — e o Caddy aceita `http://algo` como "este site é HTTP",
# desligando o HTTPS em silêncio. Em vez de aceitar, normalizamos e explicamos.
# ---------------------------------------------------------------------------
DOMINIO=$(printf '%s' "$APP_DOMAIN" | sed -E 's#^[a-zA-Z]+://##; s#/.*$##' | tr -d '[:space:]')

if [ -n "$APP_DOMAIN" ] && [ "$DOMINIO" != "$APP_DOMAIN" ]; then
  echo "!! APP_DOMAIN=\"$APP_DOMAIN\" foi corrigido para \"$DOMINIO\"."
  echo "   Use só o nome do host: sem http:// e sem barra no fim."
fi

TEM_PORTA=$(printf '%s' "$DOMINIO" | grep -c ':' || true)
EH_IP=$(printf '%s' "$DOMINIO" | grep -cE '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' || true)

if [ -z "$DOMINIO" ]; then
  ENDERECO=":80"
  echo "→ Servindo em HTTP, sem domínio definido."
  echo "   Para HTTPS automático, defina APP_DOMAIN com um domínio de verdade."
elif [ "$EH_IP" -eq 1 ] || [ "$TEM_PORTA" -ge 1 ]; then
  # Let's Encrypt não emite certificado para endereço IP, e um domínio com
  # porta embutida não é um nome de host. Servimos HTTP e dizemos por quê, em
  # vez de ficar tentando emitir um certificado que nunca vai sair.
  ENDERECO=":80"
  echo "!! \"$DOMINIO\" não é um domínio válido para certificado."
  if [ "$EH_IP" -eq 1 ]; then
    echo "   Autoridades certificadoras não emitem certificado para endereço IP."
  else
    echo "   O APP_DOMAIN não deve conter porta — só o nome do host."
  fi
  echo "→ Servindo em HTTP. ATENÇÃO: sem HTTPS, a senha do consultor trafega"
  echo "   em texto puro. Use assim apenas para teste."
else
  ENDERECO="$DOMINIO"
  echo "→ Servindo em https://$DOMINIO (certificado automático)"
  echo "   Requer as portas 80 e 443 publicadas e o DNS já apontando para cá."
fi

cat > /etc/caddy/Caddyfile <<EOF
${ENDERECO} {
    root * /srv
    encode gzip zstd

    # O roteamento é do lado do cliente: /app e /login não são arquivos no
    # disco. Sem este try_files, recarregar a página dá 404.
    try_files {path} /index.html
    file_server

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }

    # O bundle tem hash no nome: pode ser cacheado para sempre.
    @imutavel path /assets/*
    header @imutavel Cache-Control "public, max-age=31536000, immutable"

    # Estes dois mudam sem trocar de nome — nunca cachear.
    @sempre path /index.html /env-config.js
    header @sempre Cache-Control "no-store"
}
EOF

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
