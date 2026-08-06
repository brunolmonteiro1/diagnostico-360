import { NavLink, Outlet } from 'react-router-dom'
import { useSessao } from './auth/useSessao'

const navegacao = [{ para: '/app', rotulo: 'Painel', fim: true }]

export function AppLayout() {
  const { sessao, sair } = useSessao()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-bg-dark text-bg-light">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
          <div>
            <p className="text-sem-dado text-xs tracking-[0.2em] uppercase">
              Ethoa Lab
            </p>
            <p className="font-heading text-lg leading-tight">Diagnóstico 360</p>
          </div>

          <nav className="flex gap-6">
            {navegacao.map((item) => (
              <NavLink
                key={item.para}
                to={item.para}
                end={item.fim}
                className={({ isActive }) =>
                  `py-1 text-sm ${
                    isActive
                      ? 'border-accent border-b-2'
                      : 'text-sem-dado hover:text-bg-light border-b-2 border-transparent'
                  }`
                }
              >
                {item.rotulo}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <span className="text-sem-dado hidden text-sm sm:inline">
              {sessao?.user.email}
            </span>
            <button
              type="button"
              onClick={() => void sair()}
              className="hover:border-accent hover:text-accent border border-transparent px-2 py-1 text-sm underline underline-offset-4"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="grade-blueprint flex-1">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
