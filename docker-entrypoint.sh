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
  echo "   Preencha o .env.deploy (veja INSTALL.md, Passo 4) e rode de novo."
fi

# Só chave pública entra aqui. A SERVICE_ROLE_KEY e as chaves de IA vivem nos
# secrets das edge functions e nunca são servidas ao navegador.
cat > /srv/env-config.js <<EOF
window.__ENV__ = {
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY}"
};
EOF

if [ -n "$APP_DOMAIN" ]; then
  # Com domínio, o Caddy emite e renova o certificado HTTPS sozinho.
  ENDERECO="$APP_DOMAIN"
  echo "→ Servindo em https://$APP_DOMAIN (certificado automático)"
else
  # Sem domínio, responde por HTTP no IP da VPS. Serve para testar; não use
  # assim em produção — o login trafegaria sem criptografia.
  ENDERECO=":80"
  echo "→ Servindo em http://IP-DA-VPS (sem HTTPS: defina APP_DOMAIN)"
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
