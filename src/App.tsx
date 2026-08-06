/**
 * Casca inicial. As telas reais entram a partir da Fase 1 (docs/PLANO.md);
 * este arquivo existe para provar que os tokens do blueprint estão ligados.
 */
export default function App() {
  return (
    <main className="grade-blueprint min-h-screen px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="relative">
          <span aria-hidden className="numero-secao absolute -top-10 -left-2">
            00
          </span>
          <p className="text-sem-dado relative text-sm tracking-[0.2em] uppercase">
            Ethoa Lab
          </p>
          <h1 className="relative mt-2 text-4xl">Diagnóstico 360</h1>
        </div>

        <p className="mt-8 max-w-xl text-lg">
          Ferramenta de consultoria organizacional multi-empresa. Coleta a
          percepção de todos os níveis de uma empresa e gera um relatório de
          diagnóstico consolidado.
        </p>

        <p className="text-sem-dado mt-6 max-w-xl">
          Fundação do projeto instalada. As fases de produto estão descritas em{' '}
          <code>docs/PLANO.md</code> e ainda não foram implementadas.
        </p>
      </div>
    </main>
  )
}
