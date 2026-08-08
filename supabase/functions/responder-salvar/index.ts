/**
 * responder-salvar(token, pergunta_id, payload)
 *
 * Grava uma resposta. Chamada a cada mudança — é o autosave, e é o que permite
 * fechar o navegador e voltar depois pelo mesmo link.
 *
 * Também aceita os campos de identificação, que vão para `respondentes` em vez
 * de `respostas`: eles são o perfil da pessoa, e é deles que sai o roteamento
 * condicional do questionário.
 */
import {
  CORS,
  corpoJson,
  recusa,
  resposta,
  servico,
  validarToken,
} from '../_shared/responder.ts'

/** Campos do bloco de identificação que moram em `respondentes`. */
const CAMPOS_PERFIL = new Set([
  'nome',
  'email',
  'cargo',
  'area_principal',
  'areas_secundarias',
  'vinculo',
  'tempo_empresa',
  'reporta_para',
  'n_liderados',
  'consentimento_lgpd',
  'autoavaliacao_confianca',
])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const cliente = servico()
    const corpo = await corpoJson(req)
    if (!corpo) return recusa('requisicao_invalida')

    const validacao = await validarToken(cliente, corpo.token)
    if (!validacao.ok) return validacao.resposta

    const { convite } = validacao.contexto

    const { data: respondente } = await cliente
      .from('respondentes')
      .select('id, status')
      .eq('convite_id', convite.id)
      .maybeSingle()

    if (!respondente) return recusa('requisicao_invalida', 'chame responder-inicio antes')

    // --- Campos de perfil (bloco de identificação) --------------------------
    if (corpo.perfil && typeof corpo.perfil === 'object') {
      const entradas = Object.entries(corpo.perfil as Record<string, unknown>).filter(
        ([campo]) => CAMPOS_PERFIL.has(campo)
      )

      if (entradas.length > 0) {
        const { error } = await cliente
          .from('respondentes')
          .update(Object.fromEntries(entradas))
          .eq('id', respondente.id)

        if (error) throw error
      }

      return resposta({ ok: true })
    }

    // --- Resposta a uma pergunta -------------------------------------------
    const perguntaId = corpo.pergunta_id
    if (typeof perguntaId !== 'string') return recusa('requisicao_invalida')

    const naoSei = corpo.nao_sei === true
    // Mutuamente exclusivas: "não sei" ganha se as duas vierem marcadas, porque
    // é a mais conservadora — não afirma nada sobre a empresa.
    const naoExiste = !naoSei && corpo.nao_existe === true
    const marcado = naoSei || naoExiste

    // Qualquer das duas marcações limpa os três campos de valor. A constraint
    // chk_sem_valor_quando_marcado recusa a linha de qualquer jeito, mas limpar
    // aqui evita depender da mensagem de erro do banco para uma situação que é
    // normal e esperada.
    const linha = {
      respondente_id: respondente.id,
      pergunta_id: perguntaId,
      nao_sei: naoSei,
      nao_existe: naoExiste,
      valor_num: marcado ? null : normalizarNumero(corpo.valor_num),
      valor_texto: marcado ? null : normalizarTexto(corpo.valor_texto),
      valor_opcoes: marcado ? null : normalizarOpcoes(corpo.valor_opcoes),
      respondido_em: new Date().toISOString(),
    }

    const { error } = await cliente
      .from('respostas')
      .upsert(linha, { onConflict: 'respondente_id,pergunta_id' })

    if (error) throw error

    return resposta({ ok: true })
  } catch (e) {
    console.error('responder-salvar', e)
    return resposta({ ok: false, motivo: 'erro_interno' }, 500)
  }
})

function normalizarNumero(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  if (typeof valor === 'string' && valor.trim() !== '' && !Number.isNaN(Number(valor))) {
    return Number(valor)
  }
  return null
}

function normalizarTexto(valor: unknown): string | null {
  // String vazia vira null: campo aberto em branco é ausência, não resposta
  // vazia. Não há validação de tamanho mínimo em lugar nenhum — "não sei" e
  // "não quero responder" são respostas válidas.
  if (typeof valor !== 'string') return null
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

function normalizarOpcoes(valor: unknown): string[] | null {
  if (!Array.isArray(valor)) return null
  const opcoes = valor.filter((v): v is string => typeof v === 'string')
  return opcoes.length === 0 ? null : opcoes
}
