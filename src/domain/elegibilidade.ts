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
  /**
   * ID.05 — outras áreas em que a pessoa atua. Vazio é o caso comum.
   *
   * Conta igual à principal para decidir quais blocos de área ela recebe: em
   * empresa pequena, sócio que também vende e também fecha o mês é a regra, e
   * sem isto ele só conseguiria falar de uma dessas frentes.
   */
  areasSecundarias: string[]
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
 * Perguntas que dependem de outra. Duas direções, com propósitos opostos:
 *
 * - `minimo` — follow-up positivo. "Você sabe a meta?" → "qual é?". Serve para
 *   testar se o que a pessoa afirma saber ela consegue enunciar; um dos achados
 *   mais fortes do relatório é quem diz saber e não escreve.
 * - `maximo` — justificativa. Dispara quando a pessoa aponta um problema, e
 *   pede o exemplo concreto na hora, enquanto o caso ainda está na cabeça dela.
 *   Com amostra pequena é o que transforma "nota 2" em achado utilizável.
 *
 * Em nenhuma das duas direções a âncora "não sei" abre a dependente: quem não
 * tem visibilidade sobre o tema não tem meta para escrever nem exemplo para
 * dar, e cobrar produziria texto inventado.
 */
type Dependencia =
  | { ancora: string; minimo: number }
  | { ancora: string; maximo: number }

const DEPENDENCIAS: Readonly<Record<string, Dependencia>> = {
  'D4.03': { ancora: 'D4.02', minimo: 4 },
  'COM.04': { ancora: 'COM.03', minimo: 4 },
  'FIN.04': { ancora: 'FIN.03', minimo: 4 },

  // Justificativas. O sufixo .J é convenção: a pergunta aberta que explica a
  // nota baixa da âncora de mesmo código.
  'D2.04.J': { ancora: 'D2.04', maximo: 2 },
  'D2.07.J': { ancora: 'D2.07', maximo: 2 },
  'D4.05.J': { ancora: 'D4.05', maximo: 2 },
  'D5.02.J': { ancora: 'D5.02', maximo: 2 },
  'D5.06.J': { ancora: 'D5.06', maximo: 2 },
  'LID.11.J': { ancora: 'LID.11', maximo: 2 },
  'OPE.07.J': { ancora: 'OPE.07', maximo: 2 },
  'FIN.02.J': { ancora: 'FIN.02', maximo: 2 },
}

function dependenciaSatisfeita(codigo: string, respostas: Respostas): boolean {
  const dependencia = DEPENDENCIAS[codigo]
  if (!dependencia) return true

  const resposta = respostas[dependencia.ancora]
  if (!resposta || resposta.naoSei || resposta.valor === null) return false

  return 'minimo' in dependencia
    ? resposta.valor >= dependencia.minimo
    : resposta.valor <= dependencia.maximo
}

export function ehAplicavel(
  pergunta: PerguntaElegivel,
  perfil: Perfil,
  respostas: Respostas,
  modulosAtivos: readonly string[]
): boolean {
  if (!dependenciaSatisfeita(pergunta.codigo, respostas)) return false

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
    // Principal e secundárias contam igual: quem acumula funções fala de todas.
    const areasDaPessoa = [
      ...(perfil.areaPrincipal === null ? [] : [perfil.areaPrincipal]),
      ...perfil.areasSecundarias,
    ]
    if (areasDaPessoa.length === 0) return false
    if (!pergunta.areaScope.some((area) => areasDaPessoa.includes(area))) return false

    // O módulo precisa estar ativo NA RODADA. Franqueadora, por exemplo, não
    // deve ser habilitada em cliente que não é franquia. Vale mesmo quando a
    // área veio das secundárias: marcar a área não fura a configuração.
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
