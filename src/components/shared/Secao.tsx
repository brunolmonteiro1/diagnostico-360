import type { ReactNode } from 'react'

export function Secao({
  numero,
  titulo,
  descricao,
  acao,
}: {
  numero: string
  titulo: string
  descricao?: ReactNode
  acao?: ReactNode
}) {
  return (
    <div className="relative isolate mb-10 flex flex-wrap items-end justify-between gap-4">
      <div className="relative">
        <span aria-hidden className="numero-secao absolute -top-4 -left-5 -z-10">
          {numero}
        </span>
        <h1 className="text-3xl">{titulo}</h1>
        {descricao && (
          <p className="text-sem-dado mt-2 max-w-xl text-sm">{descricao}</p>
        )}
      </div>
      {acao}
    </div>
  )
}

export function Painel({
  children,
  ativo = false,
}: {
  children: ReactNode
  ativo?: boolean
}) {
  return (
    <div
      className={`border-border border bg-white p-6 ${ativo ? 'card-pergunta-ativo' : ''}`}
    >
      {children}
    </div>
  )
}

export function Estado({
  carregando,
  erro,
  vazio,
  children,
}: {
  carregando: boolean
  erro: string | null
  vazio?: ReactNode
  children: ReactNode
}) {
  if (carregando) {
    return (
      <p role="status" className="text-sem-dado text-sm">
        Carregando…
      </p>
    )
  }

  if (erro) {
    return (
      <p role="alert" className="border-critico text-critico border-l-[3px] bg-white py-2 pl-3 text-sm">
        {erro}
      </p>
    )
  }

  if (vazio) return <>{vazio}</>

  return <>{children}</>
}
