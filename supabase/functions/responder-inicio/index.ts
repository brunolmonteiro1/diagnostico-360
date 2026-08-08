/**
 * responder-inicio(token)
 *
 * Abre (ou retoma) o preenchimento. Devolve tudo que o formulário precisa numa
 * chamada só: dados da rodada, o banco de perguntas e o que a pessoa já
 * respondeu — é isso que faz a retomada funcionar depois de fechar o navegador.
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

    const { convite, rodada, cliente: empresa } = validacao.contexto

    // Um convite, um respondente. Reabrir o mesmo link retoma em vez de criar
    // uma segunda ficha — senão a mesma pessoa contaria duas vezes.
    let { data: respondente } = await cliente
      .from('respondentes')
      .select('*')
      .eq('convite_id', convite.id)
      .maybeSingle()

    if (!respondente) {
      const { data: novo, error } = await cliente
        .from('respondentes')
        .insert({
          rodada_id: rodada.id,
          convite_id: convite.id,
          nome: convite.nome_sugerido,
          email: convite.email,
          iniciado_em: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      respondente = novo

      await cliente
        .from('convites')
        .update({ aberto_em: new Date().toISOString() })
        .eq('id', convite.id)
        .is('aberto_em', null)
    }

    const [{ data: perguntas }, { data: respostas }] = await Promise.all([
      cliente
        .from('perguntas')
        .select(
          'id, codigo, bloco, dimensao, area_scope, vinculo_scope, ordem, enunciado, ajuda, tipo, opcoes, permite_nao_sei, permite_nao_existe, obrigatoria'
        )
        .eq('ativa', true)
        .order('ordem'),
      cliente
        .from('respostas')
        .select('pergunta_id, nao_sei, nao_existe, valor_num, valor_texto, valor_opcoes')
        .eq('respondente_id', respondente.id),
    ])

    return resposta({
      ok: true,
      rodada: {
        id: rodada.id,
        titulo: rodada.titulo,
        anonima: rodada.anonima,
        modulosAtivos: rodada.modulos_ativos,
        prazoEm: rodada.prazo_em,
        mensagemAbertura: rodada.mensagem_abertura,
      },
      empresa: empresa.nome_fantasia,
      respondente: {
        id: respondente.id,
        nome: respondente.nome,
        email: respondente.email,
        cargo: respondente.cargo,
        areaPrincipal: respondente.area_principal,
        areasSecundarias: respondente.areas_secundarias,
        vinculo: respondente.vinculo,
        tempoEmpresa: respondente.tempo_empresa,
        reportaPara: respondente.reporta_para,
        nLiderados: respondente.n_liderados,
        consentimentoLgpd: respondente.consentimento_lgpd,
        status: respondente.status,
      },
      perguntas: perguntas ?? [],
      respostas: respostas ?? [],
    })
  } catch (e) {
    console.error('responder-inicio', e)
    return resposta({ ok: false, motivo: 'erro_interno' }, 500)
  }
})
