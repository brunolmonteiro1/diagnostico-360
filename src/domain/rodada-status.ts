import type { Database } from '@/lib/database.types'

export type RodadaStatus = Database['public']['Enums']['rodada_status']

/**
 * Ciclo de vida da rodada. Função pura: o estado é do domínio, não da tela.
 *
 *   rascunho ──▶ aberta ──▶ encerrada ──▶ arquivada
 *      └──────────────────────────────────────┘
 *
 * Não há volta de `aberta` para `rascunho`: uma vez que alguém pôde responder,
 * o link já circulou e a rodada deixou de ser rascunho de fato. Também não há
 * volta de `encerrada` para `aberta` — reabrir mudaria o denominador de um
 * diagnóstico que já pode ter sido apresentado.
 */
const TRANSICOES: Record<RodadaStatus, readonly RodadaStatus[]> = {
  rascunho: ['aberta', 'arquivada'],
  aberta: ['encerrada'],
  encerrada: ['arquivada'],
  arquivada: [],
}

const ROTULOS: Record<RodadaStatus, string> = {
  rascunho: 'Rascunho',
  aberta: 'Aberta',
  encerrada: 'Encerrada',
  arquivada: 'Arquivada',
}

const ACOES: Partial<Record<RodadaStatus, string>> = {
  aberta: 'Abrir rodada',
  encerrada: 'Encerrar rodada',
  arquivada: 'Arquivar',
}

export function transicoesDe(status: RodadaStatus): readonly RodadaStatus[] {
  return TRANSICOES[status]
}

export function podeTransicionar(de: RodadaStatus, para: RodadaStatus): boolean {
  return TRANSICOES[de].includes(para)
}

export function rotuloStatus(status: RodadaStatus): string {
  return ROTULOS[status]
}

export function rotuloAcao(para: RodadaStatus): string {
  return ACOES[para] ?? ROTULOS[para]
}

/** Aceita respostas somente enquanto está aberta. */
export function aceitaRespostas(status: RodadaStatus): boolean {
  return status === 'aberta'
}

/**
 * Impedimentos para abrir uma rodada. Não bloqueiam por si — quem decide é o
 * consultor —, mas abrir sem convite significa link nenhum enviado, e sem
 * módulo de área o questionário fica só com o bloco universal.
 */
export function impedimentosParaAbrir(rodada: {
  totalConvites: number
  modulosAtivos: readonly string[]
}): string[] {
  const problemas: string[] = []

  if (rodada.totalConvites === 0) {
    problemas.push('Nenhum convidado importado — ninguém receberia o link.')
  }

  if (rodada.modulosAtivos.length === 0) {
    problemas.push(
      'Nenhum módulo de área ativo — o questionário teria só o bloco universal.'
    )
  }

  return problemas
}
