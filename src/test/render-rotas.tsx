import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { SessaoContext, type EstadoSessao } from '@/app/auth/sessao-context'
import { AppRoutes } from '@/routes'

export const sessaoFalsa = {
  user: { id: 'u1', email: 'consultor@teste.dev' },
} as unknown as Session

/**
 * Monta as rotas com uma sessão controlada pelo teste. Injeta o contexto no
 * lugar do SessaoProvider real, então nada aqui toca no Supabase — o que estes
 * testes verificam é o comportamento de navegação, não a autenticação.
 */
export function renderRotas({
  rota = '/',
  sessao = null,
  carregando = false,
  entrar = async () => {},
  sair = async () => {},
}: Partial<EstadoSessao> & { rota?: string } = {}) {
  const valor: EstadoSessao = { sessao, carregando, entrar, sair }

  return render(
    <MemoryRouter initialEntries={[rota]}>
      <SessaoContext value={valor}>
        <AppRoutes />
      </SessaoContext>
    </MemoryRouter>
  )
}
