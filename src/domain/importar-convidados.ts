/**
 * Leitura da lista de convidados que o consultor cola na tela — e-mails soltos
 * ou um CSV exportado do RH.
 *
 * Função pura, sem I/O. O que ela devolve é uma proposta para o consultor
 * conferir antes de gravar: nada é descartado em silêncio. Toda linha que não
 * virou convidado sai em `ignorados` com o motivo, porque numa importação de
 * 80 pessoas o que machuca não é a linha errada — é a linha que sumiu sem
 * ninguém perceber, e o diagnóstico sair sem uma área inteira.
 */

export type Convidado = {
  email: string
  nome: string | null
}

export type LinhaIgnorada = {
  linha: number
  conteudo: string
  motivo: string
}

export type ResultadoImportacao = {
  convidados: Convidado[]
  ignorados: LinhaIgnorada[]
}

// Deliberadamente simples: só descarta o que claramente não é endereço. Validar
// e-mail por regex estrita rejeita endereço válido, e o custo do falso negativo
// aqui é uma pessoa ficar de fora do diagnóstico.
const FORMATO_EMAIL = /^[^\s@,;]+@[^\s@,;.]+\.[^\s@,;]+$/

const SEPARADORES = /[,;\t]/

function normalizarEmail(valor: string): string {
  return valor.trim().toLowerCase()
}

function limparNome(valor: string | undefined): string | null {
  if (!valor) return null
  const limpo = valor.trim().replace(/^["']|["']$/g, '')
  return limpo === '' ? null : limpo
}

/**
 * Extrai o e-mail de formatos comuns de colagem:
 *   fulano@empresa.com
 *   Fulano <fulano@empresa.com>
 *   fulano@empresa.com,Fulano da Silva
 *   Fulano da Silva;fulano@empresa.com
 */
function separarCampos(linha: string): { email: string | null; nome: string | null } {
  const comChevron = linha.match(/^(.*?)<([^>]+)>\s*$/)
  if (comChevron) {
    return {
      email: normalizarEmail(comChevron[2]),
      nome: limparNome(comChevron[1]),
    }
  }

  const partes = linha
    .split(SEPARADORES)
    .map((p) => p.trim())
    .filter((p) => p !== '')

  if (partes.length === 0) return { email: null, nome: null }

  const indiceEmail = partes.findIndex((p) => FORMATO_EMAIL.test(normalizarEmail(p)))
  if (indiceEmail === -1) return { email: null, nome: null }

  const nome = partes.filter((_, i) => i !== indiceEmail).join(' ')

  return { email: normalizarEmail(partes[indiceEmail]), nome: limparNome(nome) }
}

function ehCabecalho(linha: string): boolean {
  const minuscula = linha.toLowerCase()
  return (
    (minuscula.includes('email') || minuscula.includes('e-mail')) &&
    !FORMATO_EMAIL.test(normalizarEmail(linha.split(SEPARADORES)[0] ?? ''))
  )
}

export function importarConvidados(texto: string): ResultadoImportacao {
  const convidados: Convidado[] = []
  const ignorados: LinhaIgnorada[] = []
  const jaVistos = new Map<string, number>()

  const linhas = texto.split(/\r?\n/)

  linhas.forEach((original, indice) => {
    const numero = indice + 1
    const linha = original.trim()

    if (linha === '') return

    // Cabeçalho de CSV só é descartado na primeira linha: "email" no meio da
    // lista é mais provável ser dado do que cabeçalho.
    if (indice === 0 && ehCabecalho(linha)) return

    const { email, nome } = separarCampos(linha)

    if (!email) {
      ignorados.push({
        linha: numero,
        conteudo: linha,
        motivo: 'Não encontrei um e-mail nesta linha',
      })
      return
    }

    const anterior = jaVistos.get(email)
    if (anterior !== undefined) {
      ignorados.push({
        linha: numero,
        conteudo: linha,
        motivo: `E-mail repetido (já apareceu na linha ${anterior})`,
      })
      return
    }

    jaVistos.set(email, numero)
    convidados.push({ email, nome })
  })

  return { convidados, ignorados }
}

/**
 * Remove quem já tem convite na rodada. Reimportar a mesma planilha depois de
 * acrescentar cinco pessoas é o caso normal, não a exceção — e não pode gerar
 * link novo para quem já recebeu o antigo.
 */
export function descartarJaConvidados(
  resultado: ResultadoImportacao,
  emailsExistentes: readonly string[]
): ResultadoImportacao {
  const existentes = new Set(emailsExistentes.map(normalizarEmail))

  const convidados: Convidado[] = []
  const ignorados = [...resultado.ignorados]

  for (const convidado of resultado.convidados) {
    if (existentes.has(convidado.email)) {
      ignorados.push({
        linha: 0,
        conteudo: convidado.email,
        motivo: 'Já tem convite nesta rodada',
      })
    } else {
      convidados.push(convidado)
    }
  }

  return { convidados, ignorados }
}

/** Link que cada pessoa recebe. O token é a credencial dela. */
export function linkDoConvite(origem: string, token: string): string {
  return `${origem.replace(/\/$/, '')}/responder/${token}`
}
