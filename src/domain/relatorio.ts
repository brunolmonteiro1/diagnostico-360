import {
  calcularEnps,
  calcularGapHierarquico,
  calcularRecorte,
  normalizarItem,
  type Item,
  type ResultadoRecorte,
} from './scoring.ts'

/**
 * Agregação para o relatório — funções puras, sem I/O.
 *
 * O `.ts` explícito no import acima não é estilo: este arquivo é carregado
 * também pela edge function `gerar-relatorio`, e o Deno exige extensão. O
 * frontend continua resolvendo por causa de `allowImportingTsExtensions` no
 * tsconfig. Tirar a extensão quebra o deploy, não o build.
 *
 * A garantia central deste arquivo é estrutural, não de convenção: nenhum
 * tipo exportado aqui tem campo capaz de carregar nome, e-mail ou id de
 * respondente. `PayloadRelatorio` é exatamente o que pode ir para a IA — se um
 * dia alguém precisar adicionar um campo identificado, o lugar errado é este.
 */

/** Pergunta de eNPS do bloco de encerramento (D6.05, escala 0–10, peso 0). */
export const CODIGO_ENPS = 'D6.05'

export type VinculoRespondente =
  | 'socio'
  | 'gestor'
  | 'colaborador'
  | 'terceirizado'
  | 'estagiario'
  | 'franqueadora'

const SEGMENTO_LIDERANCA: readonly VinculoRespondente[] = ['socio', 'gestor']

export type ItemComDimensao = Item & { dimensao: string }

export type RespondenteParaRelatorio = {
  id: string
  vinculo: VinculoRespondente | null
  areaPrincipal: string | null
  /**
   * Itens aplicáveis a este respondente (já filtrados por elegibilidade.ts).
   * Peso 0 é aceito aqui — `calcularRecorte` já os ignora na maturidade e na
   * visibilidade — porque é assim que o item de eNPS (D6.05) chega até esta
   * função sem precisar de um segundo parâmetro só para ele.
   */
  itens: readonly ItemComDimensao[]
}

export type RecorteDimensao = {
  dimensao: string
  geral: ResultadoRecorte
  lideranca: ResultadoRecorte
  equipe: ResultadoRecorte
  /** Nulo sempre que liderança ou equipe estiver suprimida — nunca os dois lados juntos. */
  gapHierarquico: number | null
}

export type CelulaHeatmap = {
  area: string
  dimensao: string
  resultado: ResultadoRecorte
}

export type PayloadRelatorio = {
  totalRespondentes: number
  dimensoes: RecorteDimensao[]
  heatmap: CelulaHeatmap[]
  enps: number | null
}

/**
 * Recorte de uma dimensão, restrito a quem a tem aplicável (isto é, quem tem
 * ao menos um item dessa dimensão na própria lista). `n` do recorte é essa
 * contagem — não o total de respondentes da rodada — porque colaborador não
 * tem o bloco de liderança: contá-lo no denominador da dimensão "liderança"
 * produziria uma visibilidade baixa artificial em vez de "não se aplica".
 */
function recortePorDimensao(
  respondentes: readonly RespondenteParaRelatorio[],
  dimensao: string,
  pertenceAoSegmento: (r: RespondenteParaRelatorio) => boolean
): ResultadoRecorte {
  const aplicaveis = respondentes.filter(
    (r) => pertenceAoSegmento(r) && r.itens.some((i) => i.dimensao === dimensao)
  )
  const itens = aplicaveis.flatMap((r) => r.itens.filter((i) => i.dimensao === dimensao))

  return calcularRecorte(itens, aplicaveis.length)
}

/** Média ponderada dos itens de uma dimensão para UM respondente — insumo do gap, nunca exibida sozinha. */
function scoreIndividualNaDimensao(
  itens: readonly ItemComDimensao[],
  dimensao: string
): number | null {
  const validos = itens
    .filter((i) => i.dimensao === dimensao)
    .map((i) => ({ item: i, score: normalizarItem(i) }))
    .filter((x): x is { item: ItemComDimensao; score: number } => x.score !== null && x.item.peso > 0)

  const somaPesos = validos.reduce((s, { item }) => s + item.peso, 0)
  if (somaPesos === 0) return null

  return validos.reduce((s, { item, score }) => s + score * item.peso, 0) / somaPesos
}

function recorteDaDimensao(
  respondentes: readonly RespondenteParaRelatorio[],
  dimensao: string
): RecorteDimensao {
  const geral = recortePorDimensao(respondentes, dimensao, () => true)
  const lideranca = recortePorDimensao(respondentes, dimensao, (r) =>
    r.vinculo !== null && SEGMENTO_LIDERANCA.includes(r.vinculo)
  )
  const equipe = recortePorDimensao(respondentes, dimensao, (r) => r.vinculo === 'colaborador')

  // O gap só é calculado quando os dois lados já sustentam recorte próprio —
  // um lado suprimido por sigilo não pode ser "salvo" pelo outro lado no gap.
  const gapHierarquico =
    lideranca.suprimido || equipe.suprimido
      ? null
      : calcularGapHierarquico({
          socio: respondentes
            .filter((r) => r.vinculo === 'socio')
            .map((r) => scoreIndividualNaDimensao(r.itens, dimensao))
            .filter((v): v is number => v !== null),
          gestor: respondentes
            .filter((r) => r.vinculo === 'gestor')
            .map((r) => scoreIndividualNaDimensao(r.itens, dimensao))
            .filter((v): v is number => v !== null),
          colaborador: respondentes
            .filter((r) => r.vinculo === 'colaborador')
            .map((r) => scoreIndividualNaDimensao(r.itens, dimensao))
            .filter((v): v is number => v !== null),
        })

  return { dimensao, geral, lideranca, equipe, gapHierarquico }
}

/**
 * Monta o payload agregado do relatório — o único formato aceito pela edge
 * function `gerar-relatorio` para montar o prompt da IA.
 *
 * `dimensoes` e `areas` vêm de fora (do banco de perguntas e dos módulos
 * ativos da rodada) de propósito: esta camada não hardcoda catálogo de
 * negócio, só agrega o que foi pedido.
 */
export function montarPayloadRelatorio(
  respondentes: readonly RespondenteParaRelatorio[],
  dimensoes: readonly string[],
  areas: readonly string[]
): PayloadRelatorio {
  const notasEnps = respondentes.flatMap((r) =>
    r.itens
      .filter((i) => i.codigo === CODIGO_ENPS && !i.naoSei && i.valor !== null)
      .map((i) => i.valor as number)
  )

  return {
    totalRespondentes: respondentes.length,
    dimensoes: dimensoes.map((dimensao) => recorteDaDimensao(respondentes, dimensao)),
    heatmap: areas.flatMap((area) =>
      dimensoes.map((dimensao) => ({
        area,
        dimensao,
        resultado: recortePorDimensao(respondentes, dimensao, (r) => r.areaPrincipal === area),
      }))
    ),
    enps: calcularEnps(notasEnps),
  }
}
