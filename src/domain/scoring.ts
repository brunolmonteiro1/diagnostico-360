/**
 * Motor de cálculo — funções puras, sem I/O.
 *
 * Este arquivo é onde o princípio central do produto vira aritmética: **"não
 * sei" nunca entra na maturidade**. Ele alimenta o Índice de Visibilidade, que
 * é outra grandeza. Se as duas se misturarem aqui, o diagnóstico inteiro passa
 * a mentir — e mentir de forma plausível, que é pior do que quebrar.
 *
 * A edge function `calcular-scores` apenas orquestra: a regra mora aqui, para
 * que exista uma única definição de maturidade no sistema, testada uma vez só.
 */

/** Abaixo disto não se emite nota de maturidade, em tela alguma nem no PDF. */
export const LIMIAR_VISIBILIDADE = 40

/** Recorte com menos respondentes que isto nunca é exibido. */
export const MINIMO_RECORTE = 3

/** eNPS com menos respostas que isto é suprimido. */
export const MINIMO_ENPS = 5

export type Item = {
  codigo: string
  /** Peso do item na maturidade. Zero = não pontua (abertas, escala 0–10). */
  peso: number
  /** Concordar indica problema: o valor é espelhado antes de pontuar. */
  invertida: boolean
  naoSei: boolean
  /** `null` quando não respondida ou quando é "não sei". */
  valor: number | null
}

export type ResultadoRecorte = {
  maturidade: number | null
  visibilidade: number | null
  dispersao: number | null
  /** Falso quando a visibilidade não sustenta uma nota. */
  confiavel: boolean
  /** Verdadeiro quando a amostra é pequena demais para ser exibida. */
  suprimido: boolean
  n: number
  itensValidos: number
  itensAplicaveis: number
}

/**
 * Normaliza um item para 0–100. Devolve `null` quando o item não pontua —
 * "não sei", sem resposta, ou peso zero são todos ausência de nota, não nota
 * baixa.
 */
export function normalizarItem(item: Item): number | null {
  if (item.naoSei || item.valor === null) return null

  const v = item.invertida ? 6 - item.valor : item.valor

  return ((v - 1) / 4) * 100
}

/** Desvio-padrão populacional. Nulo com menos de dois valores, onde dispersão não significa nada. */
function desvioPadrao(valores: readonly number[]): number | null {
  if (valores.length < 2) return null

  const media = valores.reduce((s, v) => s + v, 0) / valores.length
  const variancia =
    valores.reduce((s, v) => s + (v - media) ** 2, 0) / valores.length

  return Math.sqrt(variancia)
}

function media(valores: readonly number[]): number | null {
  if (valores.length === 0) return null
  return valores.reduce((s, v) => s + v, 0) / valores.length
}

/**
 * Consolida um recorte (dimensão, área, vínculo…).
 *
 * `n` é o número de RESPONDENTES do recorte, não de itens: é ele que decide a
 * supressão por sigilo. Um respondente pode contribuir com vários itens.
 */
export function calcularRecorte(
  itens: readonly Item[],
  n: number
): ResultadoRecorte {
  // Só itens que pontuam entram nas duas contas. Incluir pergunta aberta no
  // denominador da visibilidade faria uma resposta em branco — que é normal e
  // esperada — derrubar a visibilidade da dimensão.
  const pontuaveis = itens.filter((i) => i.peso > 0)
  const itensAplicaveis = pontuaveis.length

  const validos = pontuaveis
    .map((item) => ({ item, score: normalizarItem(item) }))
    .filter((x): x is { item: Item; score: number } => x.score !== null)

  const itensValidos = validos.length

  // Supressão vem primeiro e é absoluta: é promessa de sigilo feita por escrito
  // ao respondente na tela de abertura. Nem a visibilidade sai, porque "uma
  // pessoa da sua área respondeu, e ela não sabe de nada" também identifica.
  if (n < MINIMO_RECORTE) {
    return {
      maturidade: null,
      visibilidade: null,
      dispersao: null,
      confiavel: false,
      suprimido: true,
      n,
      itensValidos,
      itensAplicaveis,
    }
  }

  const visibilidade =
    itensAplicaveis === 0 ? 0 : (itensValidos / itensAplicaveis) * 100

  const confiavel = visibilidade >= LIMIAR_VISIBILIDADE

  if (!confiavel) {
    return {
      maturidade: null,
      visibilidade,
      dispersao: null,
      confiavel: false,
      suprimido: false,
      n,
      itensValidos,
      itensAplicaveis,
    }
  }

  const somaPesos = validos.reduce((s, { item }) => s + item.peso, 0)
  const maturidade =
    somaPesos === 0
      ? null
      : validos.reduce((s, { item, score }) => s + score * item.peso, 0) / somaPesos

  return {
    maturidade,
    visibilidade,
    dispersao: desvioPadrao(validos.map((v) => v.score)),
    confiavel: true,
    suprimido: false,
    n,
    itensValidos,
    itensAplicaveis,
  }
}

/**
 * Diferença entre como a liderança e a equipe enxergam a mesma coisa.
 *
 * Positivo significa liderança avaliando melhor que quem executa — o padrão
 * mais comum e o mais útil de mostrar. Nulo quando falta um dos dois lados:
 * sem colaborador não existe comparação, e inventar zero produziria um gap
 * enorme e falso.
 */
export function calcularGapHierarquico(scores: {
  socio: readonly number[]
  gestor: readonly number[]
  colaborador: readonly number[]
}): number | null {
  const lideranca = media([...scores.socio, ...scores.gestor])
  const equipe = media(scores.colaborador)

  if (lideranca === null || equipe === null) return null

  return lideranca - equipe
}

/**
 * eNPS: % de promotores (9–10) menos % de detratores (0–6). 7 e 8 são neutros
 * e entram só no denominador.
 */
export function calcularEnps(notas: readonly number[]): number | null {
  const validas = notas.filter(
    (nota) => Number.isFinite(nota) && nota >= 0 && nota <= 10
  )

  if (validas.length < MINIMO_ENPS) return null

  const promotores = validas.filter((n) => n >= 9).length
  const detratores = validas.filter((n) => n <= 6).length

  return ((promotores - detratores) / validas.length) * 100
}
