import type { RecorteDimensao } from '@/domain/relatorio'
import { rotuloDimensao } from './faixa'

/**
 * Barras divergentes do gap hierárquico, ordenadas do maior gap para o menor.
 * Só entram dimensões com gap calculável — `gapHierarquico` já vem `null` do
 * domínio quando liderança ou equipe está suprimida (ver relatorio.ts).
 */
export function BarrasGap({ dimensoes }: { dimensoes: RecorteDimensao[] }) {
  const comGap = dimensoes
    .filter((d): d is RecorteDimensao & { gapHierarquico: number } => d.gapHierarquico !== null)
    .sort((a, b) => Math.abs(b.gapHierarquico) - Math.abs(a.gapHierarquico))

  const semGap = dimensoes.filter((d) => d.gapHierarquico === null)
  const maiorAbs = Math.max(1, ...comGap.map((d) => Math.abs(d.gapHierarquico)))

  if (comGap.length === 0) {
    return (
      <p className="text-sem-dado text-sm">
        Dado insuficiente para calcular o gap hierárquico em qualquer dimensão
        nesta rodada — precisa de ao menos 3 respostas de liderança e 3 de
        equipe por dimensão.
      </p>
    )
  }

  return (
    <div>
      <ul className="space-y-3">
        {comGap.map((d) => {
          const positivo = d.gapHierarquico >= 0
          const larguraPct = (Math.abs(d.gapHierarquico) / maiorAbs) * 50

          return (
            <li key={d.dimensao} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
              <div className="flex justify-end">
                {!positivo && (
                  <div
                    className="bg-atencao h-3"
                    style={{ width: `${larguraPct}%` }}
                    title="equipe avalia melhor que a liderança"
                  />
                )}
              </div>
              <span className="text-center whitespace-nowrap">
                {rotuloDimensao(d.dimensao)} · {d.gapHierarquico > 0 ? '+' : ''}
                {Math.round(d.gapHierarquico)}
              </span>
              <div className="flex justify-start">
                {positivo && (
                  <div
                    className="bg-accent h-3"
                    style={{ width: `${larguraPct}%` }}
                    title="liderança avalia melhor que a equipe"
                  />
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {semGap.length > 0 && (
        <p className="text-sem-dado mt-4 text-sm">
          Sem gap calculável em {semGap.map((d) => rotuloDimensao(d.dimensao)).join(', ')} —
          dado insuficiente de liderança ou de equipe.
        </p>
      )}
    </div>
  )
}
