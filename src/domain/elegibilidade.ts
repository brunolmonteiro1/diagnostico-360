/**
 * Roteamento condicional do questionário — funções puras, sem I/O.
 *
 * Errar aqui não gera erro visível: gera uma pessoa respondendo perguntas que
 * não são dela, ou deixando de responder as que são. Nos dois casos o
 * diagnóstico sai plausível e errado.
 */

export type Bloco =
  | 'identificacao'
  | 'universal'
  | 'area'
  | 'lideranca'
  | 'encerramento'

export type PerguntaElegivel = {
  codigo: string
  bloco: Bloco
  /** Vazio significa "todas as áreas". */
  areaScope: string[]
  /** Vazio significa "todos os vínculos". */
  vinculoScope: string[]
  ordem: number
}

export type Perfil = {
  /** ID.04 — nulo até a pessoa responder a identificação. */
  areaPrincipal: string | null
  /** ID.06 — nulo até a pessoa responder a identificação. */
  vinculo: string | null
}

export type RespostaAtual = { valor: number | null; naoSei: boolean }
export type Respostas = Readonly<Record<string, RespostaAtual>>

/** Só estes dois vínculos respondem o bloco de liderança. */
export const VINCULOS_LIDERANCA = ['socio', 'gestor'] as const

/**
 * Áreas sem bloco próprio. Quem escolhe uma delas responde universal +
 * liderança (se o vínculo permitir) + encerramento. É intencional, não lacuna.
 */
export const AREAS_SEM_BLOCO = ['diretoria', 'outra'] as const

/**
 * Follow-ups: só aparecem se a pergunta âncora foi respondida positivamente.
 * Nenhum é obrigatório — ficar em branco é dado, e um dos achados mais fortes
 * do relatório é quem diz saber a meta e não consegue escrevê-la.
 */
const DEPENDENCIAS: Readonly<Record<string, { ancora: string; minimo: number }>> = {
  'D4.03': { ancora: 'D4.02', minimo: 4 },
  'COM.04': { ancora: 'COM.03', minimo: 4 },
  'FIN.04': { ancora: 'FIN.03', minimo: 4 },
}

function ancoraPositiva(codigo: string, respostas: Respostas): boolean {
  const dependencia = DEPENDENCIAS[codigo]
  if (!dependencia) return true

  const resposta = respostas[dependencia.ancora]
  if (!resposta || resposta.naoSei || resposta.valor === null) return false

  return resposta.valor >= dependencia.minimo
}

export function ehAplicavel(
  pergunta: PerguntaElegivel,
  perfil: Perfil,
  respostas: Respostas,
  modulosAtivos: readonly string[]
): boolean {
  if (!ancoraPositiva(pergunta.codigo, respostas)) return false

  // Escopo de vínculo vale em qualquer bloco: LID.07 (pró-labore) é só do sócio,
  // mesmo dentro do bloco de liderança.
  if (pergunta.vinculoScope.length > 0) {
    if (perfil.vinculo === null) return false
    if (!pergunta.vinculoScope.includes(perfil.vinculo)) return false
  }

  if (pergunta.bloco === 'lideranca') {
    if (perfil.vinculo === null) return false
    if (!VINCULOS_LIDERANCA.includes(perfil.vinculo as (typeof VINCULOS_LIDERANCA)[number])) {
      return false
    }
  }

  if (pergunta.areaScope.length > 0) {
    if (perfil.areaPrincipal === null) return false
    if (!pergunta.areaScope.includes(perfil.areaPrincipal)) return false

    // O módulo precisa estar ativo NA RODADA. Franqueadora, por exemplo, não
    // deve ser habilitada em cliente que não é franquia.
    if (!pergunta.areaScope.some((area) => modulosAtivos.includes(area))) return false
  }

  return true
}

export function perguntasAplicaveis<T extends PerguntaElegivel>(
  perguntas: readonly T[],
  perfil: Perfil,
  respostas: Respostas,
  modulosAtivos: readonly string[]
): T[] {
  return perguntas
    .filter((pergunta) => ehAplicavel(pergunta, perfil, respostas, modulosAtivos))
    .sort((a, b) => a.ordem - b.ordem)
}

export type Progresso = {
  respondidas: number
  total: number
  percentual: number
}

/**
 * Progresso sobre as perguntas APLICÁVEIS ao perfil, nunca sobre o total do
 * banco. Um colaborador que não vê o bloco de liderança não pode terminar o
 * questionário em 70%.
 *
 * "Não sei" conta como respondida: é resposta, não pendência. Cobrar a pessoa
 * por ela contraria o princípio do produto.
 */
export function calcularProgresso(
  aplicaveis: readonly PerguntaElegivel[],
  respostas: Respostas
): Progresso {
  const total = aplicaveis.length

  const respondidas = aplicaveis.filter((pergunta) => {
    const resposta = respostas[pergunta.codigo]
    return resposta !== undefined && (resposta.naoSei || resposta.valor !== null)
  }).length

  return {
    respondidas,
    total,
    percentual: total === 0 ? 0 : Math.min(100, (respondidas / total) * 100),
  }
}
