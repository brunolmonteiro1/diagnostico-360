export function PainelPage() {
  return (
    <div className="relative">
      <span aria-hidden className="numero-secao absolute -top-14 -left-3">
        01
      </span>

      <h1 className="relative text-3xl">Painel</h1>

      <p className="text-sem-dado mt-4 max-w-xl">
        Comece por <a href="/app/clientes" className="underline underline-offset-4">Clientes</a>:
        cada cliente tem suas rodadas, e cada rodada tem seus convidados.
        O questionário do respondente entra na Fase 4.
      </p>
    </div>
  )
}
