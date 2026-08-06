import { z } from 'zod'

/**
 * Só variáveis públicas moram aqui.
 *
 * Tudo com prefixo VITE_ é embutido no JavaScript servido ao navegador. Se um
 * segredo precisar existir, ele vive nos secrets das edge functions — nunca
 * neste arquivo, nunca em import.meta.env.
 */
const schema = z.object({
  VITE_SUPABASE_URL: z.url('VITE_SUPABASE_URL precisa ser uma URL válida'),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'VITE_SUPABASE_ANON_KEY não pode estar vazia'),
})

const resultado = schema.safeParse(import.meta.env)

if (!resultado.success) {
  const problemas = resultado.error.issues
    .map((i) => `  · ${i.message}`)
    .join('\n')

  throw new Error(
    `Configuração de ambiente inválida:\n${problemas}\n\n` +
      'Copie .env.local.example para .env.local e preencha os valores do seu ' +
      'projeto Supabase.'
  )
}

export const env = resultado.data
