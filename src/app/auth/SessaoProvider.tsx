import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { SessaoContext, type EstadoSessao } from './sessao-context'

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSessao(data.session)
      setCarregando(false)
    })

    // Cobre login, logout, refresh de token e logout feito em outra aba.
    const { data: inscricao } = supabase.auth.onAuthStateChange(
      (_evento, novaSessao) => {
        if (!ativo) return
        setSessao(novaSessao)
        setCarregando(false)
      }
    )

    return () => {
      ativo = false
      inscricao.subscription.unsubscribe()
    }
  }, [])

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) throw error
  }, [])

  const sair = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const valor = useMemo<EstadoSessao>(
    () => ({ sessao, carregando, entrar, sair }),
    [sessao, carregando, entrar, sair]
  )

  return <SessaoContext value={valor}>{children}</SessaoContext>
}
