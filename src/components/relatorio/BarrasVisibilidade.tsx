import type { RecorteDimensao } from '@/domain/relatorio'
import { rotuloDimensao } from './faixa'

/**
 * Índice de Visibilidade por dimensão — a métrica separada da maturidade
 * (princípio central do produto). Uma barra baixa aqui não é "desempenho
 * ruim", é "a organização não tem dado suficiente sobre isto ainda".
 */
export function BarrasVisibilidade({ dimensoes }: { dimensoes: RecorteDimensao[] }) {
  return (
    <ul className="space-y-3">
      {dimensoes.map((d) => {
        const visibilidade = d.geral.visibilidade
        return (
          <li key={d.dimensao}>
            <div className="flex items-baseline justify-between text-sm">
              <span>{rotuloDimensao(d.dimensao)}</span>
              <span className="text-sem-dado">
                {d.geral.suprimido || visibilidade === null
                  ? 'dado insuficiente'
                  : `${Math.round(visibilidade)}%`}
              </span>
            </div>
            <div className="bg-muted mt-1 h-1.5 w-full">
              <div
                className="bg-accent h-full"
                style={{
                  width: `${d.geral.suprimido || visibilidade === null ? 0 : Math.min(100, Math.max(0, visibilidade))}%`,
                }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
