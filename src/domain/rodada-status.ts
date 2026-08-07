import type { Database } from '@/lib/database.types'

export type RodadaStatus = Database['public']['Enums']['rodada_status']

/**
 * Ciclo de vida da rodada. Função pura: o estado é do domínio, não da tela.
 *
 *   rascunho ──▶ aberta ──▶ encerrada ──▶ arquivada
 *      └──────────────────────────────────────┘◀──────┘
 *
 * Não há volta de `aberta` para `rascunho`: uma vez que alguém pôde responder,
 * o link já circulou e a rodada deixou de ser rascunho de fato. Também não há
 * volta de `encerrada` para `aberta` — reabrir mudaria o denominador de um
 * diagnóstico que já pode ter sido apresentado.
 *
 * `arquivada → encerrada` É permitida, e de propósito: arquivar é organização
 * ("tirar da lista principal"), não uma trava metodológica como as duas acima.
 * Sem essa volta, um clique a mais em "Arquivar" prendia a rodada num estado
 * sem nenhuma ação possível — a interface inteira ficava muda.
 */
const TRANSICOES: Record<RodadaStatus, readonly RodadaStatus[]> = {
  rascunho: ['aberta', 'arquivada'],
  aberta: ['encerrada'],
  encerrada: ['arquivada'],
  arquivada: ['encerrada'],
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

/**
 * O rótulo depende de onde se vem, não só para onde se vai: `encerrada` é
 * destino de duas transições diferentes (`aberta → encerrada` e
 * `arquivada → encerrada`), e "Encerrar rodada" não faz sentido na segunda.
 */
export function rotuloAcao(de: RodadaStatus, para: RodadaStatus): string {
  if (de === 'arquivada' && para === 'encerrada') return 'Desarquivar'
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
