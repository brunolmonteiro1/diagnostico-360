import { z } from 'zod'

/**
 * Só variáveis públicas moram aqui.
 *
 * Tudo com prefixo VITE_ é embutido no JavaScript servido ao navegador. Se um
 * segredo precisar existir, ele vive nos secrets das edge functions — nunca
 * neste arquivo, nunca em import.meta.env.
 *
 * Duas origens, nesta ordem:
 *
 * 1. `window.__ENV__`, escrito a cada boot do container (docker-entrypoint.sh).
 *    Um app Vite é compilado uma vez e servido estático, então o que é lido no
 *    build fica congelado no bundle; a injeção em tempo de execução é o que
 *    permite trocar o projeto Supabase sem recompilar a imagem.
 * 2. `import.meta.env`, do .env.local, no desenvolvimento.
 */
declare global {
  interface Window {
    __ENV__?: Partial<Record<string, string>>
  }
}

const emExecucao = typeof window !== 'undefined' ? (window.__ENV__ ?? {}) : {}

const bruto = {
  VITE_SUPABASE_URL:
    emExecucao.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY:
    emExecucao.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
}

const schema = z.object({
  VITE_SUPABASE_URL: z.url('VITE_SUPABASE_URL precisa ser uma URL válida'),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'VITE_SUPABASE_ANON_KEY não pode estar vazia'),
})

const resultado = schema.safeParse(bruto)

if (!resultado.success) {
  const problemas = resultado.error.issues.map((i) => `  · ${i.message}`).join('\n')

  throw new Error(
    `Configuração de ambiente inválida:\n${problemas}\n\n` +
      'No desenvolvimento: copie .env.local.example para .env.local e preencha ' +
      'os valores do seu projeto Supabase.\n' +
      'Na VPS: preencha o .env.deploy e rode `docker compose --env-file ' +
      '.env.deploy up -d` (veja INSTALL.md).'
  )
}

export const env = resultado.data
