import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './app/AppLayout'
import { PainelPage } from './app/PainelPage'
import { ClientesPage } from './app/clientes/ClientesPage'
import { ClienteDetalhePage } from './app/clientes/ClienteDetalhePage'
import { RodadaDetalhePage } from './app/rodadas/RodadaDetalhePage'
import { PerguntasPage } from './app/perguntas/PerguntasPage'
import { LoginPage } from './app/auth/LoginPage'
import { RotaProtegida } from './app/auth/RotaProtegida'
import { ResponderPage } from './responder/ResponderPage'

/**
 * Separado de <App> para que os testes montem as rotas sem BrowserRouter e sem
 * o provider real de sessão.
 *
 * O fluxo público /responder/:token entra na Fase 4 e não compartilha layout
 * nem provider com estas rotas.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Fluxo público: sem sessão, sem layout do consultor. O token é a credencial. */}
      <Route path="/responder/:token" element={<ResponderPage />} />

      <Route element={<RotaProtegida />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<PainelPage />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="clientes/:clienteId" element={<ClienteDetalhePage />} />
          <Route path="rodadas/:rodadaId" element={<RodadaDetalhePage />} />
          <Route path="perguntas" element={<PerguntasPage />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <main className="grade-blueprint flex min-h-screen items-center justify-center px-6">
            <div className="text-center">
              <h1 className="text-2xl">Página não encontrada</h1>
              <p className="text-sem-dado mt-2 text-sm">
                O endereço acessado não existe.
              </p>
            </div>
          </main>
        }
      />
    </Routes>
  )
}
