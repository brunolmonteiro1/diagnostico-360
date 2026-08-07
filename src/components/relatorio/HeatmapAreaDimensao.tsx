import type { CelulaHeatmap } from '@/domain/relatorio'
import { COR_FAIXA, COR_SEM_DADO, faixaDeSaude, rotuloDimensao } from './faixa'

/**
 * Mapa de calor área × dimensão. Célula suprimida (amostra < 3 ou
 * visibilidade < 40%) sai em `--sem-dado` — cinza, nunca vermelho. Pintar de
 * vermelho o que a organização não sabe diria que não saber é erro, o oposto
 * da promessa de sigilo feita ao respondente.
 */
export function HeatmapAreaDimensao({ celulas }: { celulas: CelulaHeatmap[] }) {
  const areas = [...new Set(celulas.map((c) => c.area))].sort()
  const dimensoes = [...new Set(celulas.map((c) => c.dimensao))].sort()

  if (areas.length === 0 || dimensoes.length === 0) {
    return <p className="text-sem-dado text-sm">Sem áreas ativas para cruzar com dimensão.</p>
  }

  const celula = (area: string, dimensao: string) =>
    celulas.find((c) => c.area === area && c.dimensao === dimensao)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-sem-dado p-2 text-left font-normal"></th>
            {dimensoes.map((d) => (
              <th key={d} className="text-sem-dado p-2 text-center font-normal">
                {rotuloDimensao(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {areas.map((area) => (
            <tr key={area}>
              <th className="p-2 text-left font-normal whitespace-nowrap">{area}</th>
              {dimensoes.map((dimensao) => {
                const c = celula(area, dimensao)
                const maturidade = c?.resultado.confiavel ? c.resultado.maturidade : null
                const cor =
                  maturidade === null ? COR_SEM_DADO : COR_FAIXA[faixaDeSaude(maturidade)]

                return (
                  <td key={dimensao} className="p-1">
                    <div
                      className="flex h-12 w-full items-center justify-center text-xs font-medium"
                      style={{ background: cor, color: 'var(--bg-light)' }}
                      title={
                        maturidade === null
                          ? 'dado insuficiente'
                          : `${Math.round(maturidade)} de maturidade`
                      }
                    >
                      {maturidade === null ? '—' : Math.round(maturidade)}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
