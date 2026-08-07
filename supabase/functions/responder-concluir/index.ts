/**
 * responder-concluir(token)
 *
 * Marca o preenchimento como concluído. É o que faz a pessoa entrar na conta do
 * relatório: o cockpit e a supressão por amostra contam concluídos, não
 * iniciados.
 *
 * Não valida completude. O produto inteiro é construído sobre não obrigar
 * ninguém a responder o que não sabe — travar a conclusão por campo em branco
 * contraria isso e só produziria chute.
 */
import {
  CORS,
  corpoJson,
  recusa,
  resposta,
  servico,
  validarToken,
} from '../_shared/responder.ts'

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
      .select('id, status, iniciado_em, concluido_em')
      .eq('convite_id', convite.id)
      .maybeSingle()

    if (!respondente) return recusa('requisicao_invalida', 'chame responder-inicio antes')

    // Idempotente: reenviar não reescreve a data da primeira conclusão.
    if (respondente.status === 'concluido') {
      return resposta({ ok: true, jaConcluido: true })
    }

    const agora = new Date()
    const duracao = respondente.iniciado_em
      ? Math.max(
          0,
          Math.round((agora.getTime() - new Date(respondente.iniciado_em).getTime()) / 1000)
        )
      : null

    const { error } = await cliente
      .from('respondentes')
      .update({
        status: 'concluido',
        concluido_em: agora.toISOString(),
        duracao_segundos: duracao,
      })
      .eq('id', respondente.id)

    if (error) throw error

    return resposta({ ok: true, jaConcluido: false })
  } catch (e) {
    console.error('responder-concluir', e)
    return resposta({ ok: false, motivo: 'erro_interno' }, 500)
  }
})
