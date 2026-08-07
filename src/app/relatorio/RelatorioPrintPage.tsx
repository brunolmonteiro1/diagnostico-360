import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Estado } from '@/components/shared/Secao'
import { useConsulta } from '@/hooks/useConsulta'
import { obterRelatorio, obterRodada, type Relatorio } from '@/lib/api'
import type { PayloadRelatorio } from '@/domain/relatorio'
import type { NarrativaRelatorio } from '@/domain/relatorio-prompt'
import { RadarDimensoes } from '@/components/relatorio/RadarDimensoes'
import { BarrasVisibilidade } from '@/components/relatorio/BarrasVisibilidade'
import { BarrasGap } from '@/components/relatorio/BarrasGap'
import { HeatmapAreaDimensao } from '@/components/relatorio/HeatmapAreaDimensao'
import { rotuloDimensao } from '@/components/relatorio/faixa'

function comoPayload(scores: Relatorio['scores']): PayloadRelatorio {
  return scores as unknown as PayloadRelatorio
}
function comoNarrativa(narrativa: Relatorio['narrativa']): NarrativaRelatorio {
  return narrativa as unknown as NarrativaRelatorio
}

/**
 * Rota de impressão/exportação — só leitura, sem chrome do app (sem sidebar,
 * sem edição). Usa `narrativa_editada` quando existir: é ela que representa
 * a revisão do consultor, nunca a saída bruta da IA (critério de pronto da
 * Fase 6 — "nunca entregar saída de IA direto ao cliente").
 */
export function RelatorioPrintPage() {
  const { relatorioId = '' } = useParams()

  const relatorio = useConsulta(
    useCallback(() => obterRelatorio(relatorioId), [relatorioId]),
    [relatorioId]
  )
  const rodadaId = relatorio.dados?.rodada_id ?? ''
  const rodada = useConsulta(
    useCallback(() => (rodadaId ? obterRodada(rodadaId) : Promise.resolve(null)), [rodadaId]),
    [rodadaId]
  )

  return (
    <main className="mx-auto max-w-4xl bg-white px-8 py-10 print:px-0 print:py-0">
      <Estado carregando={relatorio.carregando} erro={relatorio.erro}>
        {relatorio.dados && (
          <Conteudo relatorio={relatorio.dados} titulo={rodada.dados?.titulo ?? ''} />
        )}
      </Estado>
    </main>
  )
}

function Conteudo({ relatorio, titulo }: { relatorio: Relatorio; titulo: string }) {
  const payload = comoPayload(relatorio.scores)
  const narrativa = comoNarrativa(relatorio.narrativa_editada ?? relatorio.narrativa)

  return (
    <div className="space-y-10">
      <header className="border-border border-b pb-6">
        <p className="text-accent text-sm tracking-[0.2em] uppercase">Diagnóstico 360 · Ethos Lab</p>
        <h1 className="mt-1 text-3xl">{titulo}</h1>
        <p className="text-sem-dado mt-2 text-sm">
          Relatório v{relatorio.versao} · {new Date(relatorio.gerado_em).toLocaleDateString('pt-BR')} ·{' '}
          {payload.totalRespondentes} respondente(s) concluído(s)
        </p>
      </header>

      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg">Sumário executivo</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {narrativa.sumario_executivo.map((linha, i) => (
            <li key={i}>{linha}</li>
          ))}
        </ul>
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg">Panorama por dimensão</h2>
        <RadarDimensoes dimensoes={payload.dimensoes} />
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg">Diagnóstico por dimensão</h2>
        <dl className="space-y-3 text-sm">
          {narrativa.diagnostico_por_dimensao.map((item) => (
            <div key={item.dimensao}>
              <dt className="font-medium">{rotuloDimensao(item.dimensao)}</dt>
              <dd className="text-sem-dado">{item.texto}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg">Índice de Visibilidade</h2>
        <BarrasVisibilidade dimensoes={payload.dimensoes} />
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg">Gap hierárquico</h2>
        <BarrasGap dimensoes={payload.dimensoes} />
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg">Mapa de calor — área × dimensão</h2>
        <HeatmapAreaDimensao celulas={payload.heatmap} />
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg">Achados por área</h2>
        <dl className="space-y-3 text-sm">
          {narrativa.achados_por_area.map((item) => (
            <div key={item.area}>
              <dt className="font-medium capitalize">{item.area}</dt>
              <dd className="text-sem-dado">{item.texto}</dd>
            </div>
          ))}
        </dl>
      </section>

      {(
        [
          ['Gargalos', narrativa.gargalos],
          ['Riscos críticos', narrativa.riscos_criticos],
          ['O que funciona', narrativa.o_que_funciona],
          ['Iniciativas sugeridas', narrativa.iniciativas],
          ['Lacunas do diagnóstico', narrativa.lacunas_do_diagnostico],
        ] as const
      ).map(([titulo, itens]) => (
        <section key={titulo} className="break-inside-avoid">
          <h2 className="mb-3 text-lg">{titulo}</h2>
          {itens.length === 0 ? (
            <p className="text-sem-dado text-sm">Nada registrado.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {itens.map((linha, i) => (
                <li key={i}>{linha}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
