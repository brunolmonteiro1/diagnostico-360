import { useContext } from 'react'
import { SessaoContext } from './sessao-context'

export function useSessao() {
  const contexto = useContext(SessaoContext)

  if (!contexto) {
    throw new Error('useSessao precisa estar dentro de <SessaoProvider>')
  }

  return contexto
}
