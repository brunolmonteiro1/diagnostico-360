import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import type { RecorteDimensao } from '@/domain/relatorio'
import { rotuloDimensao } from './faixa'

/**
 * Radar das 6 dimensões em 3 séries (geral, liderança, equipe).
 *
 * Dimensão sem confiabilidade (visibilidade < 40% ou amostra suprimida)
 * entra como `null`, não como zero — zero afirmaria "maturidade baixa", que é
 * exatamente o que o princípio central do produto proíbe para dado ausente.
 * A tabela abaixo do gráfico é a fonte de verdade; o radar é só visão geral.
 */
export function RadarDimensoes({ dimensoes }: { dimensoes: RecorteDimensao[] }) {
  const dados = dimensoes.map((d) => ({
    dimensao: rotuloDimensao(d.dimensao),
    geral: d.geral.confiavel ? Math.round(d.geral.maturidade!) : null,
    lideranca: d.lideranca.confiavel ? Math.round(d.lideranca.maturidade!) : null,
    equipe: d.equipe.confiavel ? Math.round(d.equipe.maturidade!) : null,
  }))

  const algumaLacuna = dimensoes.some(
    (d) => !d.geral.confiavel || !d.lideranca.confiavel || !d.equipe.confiavel
  )

  return (
    <div>
      <ResponsiveContainer width="100%" height={340}>
        <RadarChart data={dados} outerRadius="75%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="dimensao" tick={{ fill: 'var(--foreground)', fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="var(--border)" />
          <Radar
            name="Geral"
            dataKey="geral"
            stroke="var(--sem-dado)"
            fill="var(--sem-dado)"
            fillOpacity={0.15}
          />
          <Radar
            name="Liderança"
            dataKey="lideranca"
            stroke="var(--bg-dark)"
            fill="var(--bg-dark)"
            fillOpacity={0.12}
          />
          <Radar
            name="Equipe"
            dataKey="equipe"
            stroke="var(--accent-blueprint)"
            fill="var(--accent-blueprint)"
            fillOpacity={0.15}
          />
        </RadarChart>
      </ResponsiveContainer>

      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <li className="flex items-center gap-2">
          <span className="inline-block h-2 w-2" style={{ background: 'var(--sem-dado)' }} />
          Geral
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-2 w-2" style={{ background: 'var(--bg-dark)' }} />
          Liderança (sócio + gestor)
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-2 w-2" style={{ background: 'var(--accent-blueprint)' }} />
          Equipe (colaborador)
        </li>
      </ul>

      {algumaLacuna && (
        <p className="text-sem-dado mt-3 text-sm">
          Eixo sem linha para uma série = dado insuficiente naquele recorte
          (visibilidade abaixo de 40% ou amostra menor que 3 pessoas) — nunca
          leia como maturidade zero.
        </p>
      )}
    </div>
  )
}
