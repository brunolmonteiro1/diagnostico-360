import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type EstadoSessao = {
  /** `null` = sem sessão. Só é confiável quando `carregando` é false. */
  sessao: Session | null
  /**
   * Verdadeiro enquanto ainda não sabemos se existe sessão. Distinguir isto de
   * "sem sessão" é o que impede a tela de login de piscar para quem já está
   * autenticado no primeiro carregamento.
   */
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<void>
  sair: () => Promise<void>
}

export const SessaoContext = createContext<EstadoSessao | null>(null)
