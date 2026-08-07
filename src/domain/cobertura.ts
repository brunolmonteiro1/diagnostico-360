import { MINIMO_RECORTE } from './scoring'

/**
 * Cobertura da rodada — o que o consultor precisa ver ANTES de encerrar.
 *
 * O número que engana é a taxa geral. 80% de resposta com 0% do financeiro é
 * diagnóstico inválido, e depois de encerrada a rodada não há o que corrigir.
 * Por isso a quebra por área e por vínculo não é detalhe de tela: é o que
 * transforma "faltam pessoas" em "faltam ESTAS pessoas", enquanto ainda dá
 * tempo de cobrar.
 */

export type RespondenteResumo = {
  areaPrincipal: string | null
  vinculo: string | null
  concluido: boolean
}

export type Recorte = {
  chave: string
  iniciados: number
  concluidos: number
  /**
   * Verdadeiro quando o recorte não vai aparecer no relatório por sigilo.
   * Avisar aqui é o que evita descobrir a supressão só na hora de apresentar.
   */
  abaixoDoMinimo: boolean
}

export type Cobertura = {
  convidados: number
  iniciados: number
  concluidos: number
  /** Concluídos sobre convidados. Nulo quando ninguém foi convidado. */
  taxa: number | null
  porArea: Recorte[]
  porVinculo: Recorte[]
  /** Recortes que já responderam mas não vão aparecer no relatório. */
  recortesSuprimidos: string[]
}

function agrupar(
  respondentes: readonly RespondenteResumo[],
  chaveDe: (r: RespondenteResumo) => string | null
): Recorte[] {
  const grupos = new Map<string, { iniciados: number; concluidos: number }>()

  for (const r of respondentes) {
    // Quem ainda não chegou na identificação não tem área nem vínculo: some do
    // recorte em vez de virar um grupo "null" que ninguém sabe ler.
    const chave = chaveDe(r)
    if (chave === null || chave === '') continue

    const atual = grupos.get(chave) ?? { iniciados: 0, concluidos: 0 }
    atual.iniciados += 1
    if (r.concluido) atual.concluidos += 1
    grupos.set(chave, atual)
  }

  return [...grupos.entries()]
    .map(([chave, v]) => ({
      chave,
      iniciados: v.iniciados,
      concluidos: v.concluidos,
      abaixoDoMinimo: v.concluidos < MINIMO_RECORTE,
    }))
    .sort((a, b) => a.chave.localeCompare(b.chave))
}

export function calcularCobertura(
  convidados: number,
  respondentes: readonly RespondenteResumo[]
): Cobertura {
  const iniciados = respondentes.length
  const concluidos = respondentes.filter((r) => r.concluido).length

  const porArea = agrupar(respondentes, (r) => r.areaPrincipal)
  const porVinculo = agrupar(respondentes, (r) => r.vinculo)

  return {
    convidados,
    iniciados,
    concluidos,
    taxa: convidados === 0 ? null : (concluidos / convidados) * 100,
    porArea,
    porVinculo,
    recortesSuprimidos: [...porArea, ...porVinculo]
      .filter((r) => r.abaixoDoMinimo)
      .map((r) => r.chave),
  }
}
