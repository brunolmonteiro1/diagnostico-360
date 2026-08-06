import { createClient } from '@supabase/supabase-js'
import { env } from './env'
import type { Database } from './database.types'

/**
 * Client do consultor autenticado. Usa a anon key e, portanto, está sujeito à
 * RLS — que é onde o isolamento entre consultores realmente acontece.
 *
 * O fluxo do respondente NÃO usa este client. Ele não faz login: toda leitura e
 * gravação dele passa por edge function com service role que valida o token.
 * Um `supabase.from('respostas')` dentro de src/responder/ significa que o
 * modelo de segurança foi quebrado.
 */
export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
