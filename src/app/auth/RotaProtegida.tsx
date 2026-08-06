import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSessao } from './useSessao'

/**
 * Guarda das rotas do consultor.
 *
 * É conveniência de navegação, não mecanismo de segurança: quem protege o dado
 * é a RLS no banco. Esta guarda existe para que a pessoa veja a tela de login em
 * vez de um painel vazio.
 */
export function RotaProtegida() {
  const { sessao, carregando } = useSessao()
  const location = useLocation()

  // Enquanto não sabemos, não decidimos: redirecionar aqui jogaria para o login
  // quem já está autenticado.
  if (carregando) {
    return (
      <div
        className="grade-blueprint text-sem-dado flex min-h-screen items-center justify-center text-sm"
        role="status"
      >
        Carregando…
      </div>
    )
  }

  if (!sessao) {
    return <Navigate to="/login" replace state={{ de: location.pathname }} />
  }

  return <Outlet />
}
