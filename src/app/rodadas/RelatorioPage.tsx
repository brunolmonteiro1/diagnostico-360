import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Estado, Painel, Secao } from '@/components/shared/Secao'
import { useConsulta } from '@/hooks/useConsulta'
import {
  gerarRelatorio,
  obterRodada,
  obterUltimoRelatorio,
  salvarNarrativaEditada,
  type FalhaGeracaoRelatorio,
  type Relatorio,
} from '@/lib/api'
import type { PayloadRelatorio } from '@/domain/relatorio'
import type { NarrativaRelatorio } from '@/domain/relatorio-prompt'
import { RadarDimensoes } from '@/components/relatorio/RadarDimensoes'
import { BarrasVisibilidade } from '@/components/relatorio/BarrasVisibilidade'
import { BarrasGap } from '@/components/relatorio/BarrasGap'
import { HeatmapAreaDimensao } from '@/components/relatorio/HeatmapAreaDimensao'
import { BlocosNarrativa } from '@/components/relatorio/BlocosNarrativa'

const MENSAGEM_FALHA: Record<FalhaGeracaoRelatorio, string> = {
  nao_autenticado: 'Sessão expirada — faça login de novo antes de tentar.',
  requisicao_invalida: 'Requisição inválida ao gerar o relatório.',
  rodada_nao_encontrada: 'Rodada não encontrada.',
  resposta_ia_invalida:
    'O modelo de IA devolveu uma resposta fora do formato esperado. Tente gerar de novo.',
  erro_interno: 'Erro inesperado ao gerar o relatório. Tente de novo em instantes.',
}

/** Colunas jsonb chegam tipadas como `Json` genérico — o formato é garantido por quem grava (gerar-relatorio). */
function comoPayload(scores: Relatorio['scores']): PayloadRelatorio {
  return scores as unknown as PayloadRelatorio
}
function comoNarrativa(narrativa: Relatorio['narrativa']): NarrativaRelatorio {
  return narrativa as unknown as NarrativaRelatorio
}

export function RelatorioPage() {
  const { rodadaId = '' } = useParams()
  const [gerando, setGerando] = useState(false)
  const [erroGeracao, setErroGeracao] = useState<string | null>(null)

  const rodada = useConsulta(useCallback(() => obterRodada(rodadaId), [rodadaId]), [rodadaId])
  const relatorio = useConsulta(
    useCallback(() => obterUltimoRelatorio(rodadaId), [rodadaId]),
    [rodadaId]
  )

  const gerar = async () => {
    setGerando(true)
    setErroGeracao(null)
    const resultado = await gerarRelatorio(rodadaId)
    setGerando(false)

    if (!resultado.ok) {
      setErroGeracao(MENSAGEM_FALHA[resultado.motivo])
      return
    }
    relatorio.recarregar()
  }

  const salvarNarrativa = async (nova: NarrativaRelatorio) => {
    if (!relatorio.dados) return
    await salvarNarrativaEditada(relatorio.dados.id, nova as unknown as Relatorio['narrativa'])
    relatorio.recarregar()
  }

  return (
    <div>
      <Secao
        numero="06"
        titulo="Relatório"
        descricao={rodada.dados?.titulo}
        acao={
          <div className="flex items-center gap-3">
            {relatorio.dados && (
              <Button variant="outline" asChild>
                <Link to={`/relatorio/${relatorio.dados.id}/print`} target="_blank" rel="noreferrer">
                  Imprimir / exportar
                </Link>
              </Button>
            )}
            <Button onClick={gerar} disabled={gerando}>
              {gerando ? 'Gerando…' : relatorio.dados ? 'Gerar nova versão' : 'Gerar relatório'}
            </Button>
          </div>
        }
      />

      {erroGeracao && (
        <p
          role="alert"
          className="border-critico text-critico mb-6 border-l-[3px] bg-white py-2 pl-3 text-sm"
        >
          {erroGeracao}
        </p>
      )}

      <Estado
        carregando={relatorio.carregando}
        erro={relatorio.erro}
        vazio={
          !relatorio.dados ? (
            <Painel>
              <p className="text-sem-dado text-sm">
                Nenhum relatório gerado ainda para esta rodada. Clique em "Gerar relatório".
              </p>
            </Painel>
          ) : undefined
        }
      >
        {relatorio.dados && (
          <ConteudoRelatorio relatorio={relatorio.dados} onSalvarNarrativa={salvarNarrativa} />
        )}
      </Estado>
    </div>
  )
}

function ConteudoRelatorio({
  relatorio,
  onSalvarNarrativa,
}: {
  relatorio: Relatorio
  onSalvarNarrativa: (n: NarrativaRelatorio) => Promise<void>
}) {
  const payload = comoPayload(relatorio.scores)
  const narrativaAtiva = comoNarrativa(relatorio.narrativa_editada ?? relatorio.narrativa)

  return (
    <div className="space-y-10">
      <p className="text-sem-dado text-sm">
        Versão {relatorio.versao} · gerado em{' '}
        {new Date(relatorio.gerado_em).toLocaleString('pt-BR')} · {payload.totalRespondentes}{' '}
        respondente(s) concluído(s)
        {relatorio.editado_manualmente && ' · narrativa editada pelo consultor'}
      </p>

      <Painel>
        <h2 className="mb-4 text-lg">Panorama por dimensão</h2>
        <RadarDimensoes dimensoes={payload.dimensoes} />
      </Painel>

      <div className="grid gap-8 lg:grid-cols-2">
        <Painel>
          <h2 className="mb-4 text-lg">Índice de Visibilidade</h2>
          <BarrasVisibilidade dimensoes={payload.dimensoes} />
        </Painel>

        <Painel>
          <h2 className="mb-4 text-lg">Gap hierárquico</h2>
          <p className="text-sem-dado mb-4 text-sm">
            Dourado: liderança avalia melhor que a equipe. Âmbar: o inverso.
          </p>
          <BarrasGap dimensoes={payload.dimensoes} />
        </Painel>
      </div>

      <Painel>
        <h2 className="mb-4 text-lg">Mapa de calor — área × dimensão</h2>
        <HeatmapAreaDimensao celulas={payload.heatmap} />
      </Painel>

      <div>
        <h2 className="mb-4 text-lg">Narrativa</h2>
        <BlocosNarrativa
          narrativa={narrativaAtiva}
          editadaAnteriormente={relatorio.editado_manualmente}
          onSalvar={onSalvarNarrativa}
        />
      </div>
    </div>
  )
}
