/**
 * gerar-relatorio(rodada_id)
 *
 * Chamada pelo consultor autenticado (JWT no Authorization), não pelo
 * respondente. Monta o payload SÓ com agregados (src/domain/relatorio.ts),
 * chama o modelo via OpenRouter com o prompt de sistema definido em
 * src/domain/relatorio-prompt.ts, valida a saída à mão (sem zod — ver nota
 * em relatorio-prompt.ts) e persiste uma nova versão em `relatorios`.
 *
 * Duas superfícies de privilégio, de propósito separadas:
 * - Toda LEITURA usa um client escopado no JWT do próprio consultor: a RLS
 *   decide o que ele vê, exatamente como o resto do app. Se `rodada_id` não
 *   for dele, a rodada simplesmente não aparece — sem lógica de dono
 *   duplicada aqui.
 * - Só o INSERT final em `relatorios` usa service role, porque não existe
 *   (de propósito) policy de insert para `authenticated`: quem grava é
 *   sempre esta function, nunca o consultor direto.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  montarPayloadRelatorio,
  type ItemComDimensao,
  type RespondenteParaRelatorio,
  type VinculoRespondente,
} from '../../../src/domain/relatorio.ts'
import {
  SYSTEM_PROMPT_RELATORIO,
  construirMensagemUsuario,
  validarNarrativa,
} from '../../../src/domain/relatorio-prompt.ts'
import { MODELO_RELATORIO_PADRAO, chatCompletion, extrairJson } from '../_shared/openrouter.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return resposta({ ok: false, motivo: 'nao_autenticado' }, 401)

    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Escopado no JWT do consultor: toda leitura abaixo respeita a RLS dele.
    const comoConsultor = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const {
      data: { user },
    } = await comoConsultor.auth.getUser()
    if (!user) return resposta({ ok: false, motivo: 'nao_autenticado' }, 401)

    let corpo: Record<string, unknown> | null = null
    try {
      corpo = await req.json()
    } catch {
      /* corpo inválido tratado abaixo */
    }
    const rodadaId = corpo?.rodada_id
    if (typeof rodadaId !== 'string' || rodadaId.trim() === '') {
      return resposta({ ok: false, motivo: 'requisicao_invalida' }, 400)
    }

    const { data: rodada } = await comoConsultor
      .from('rodadas')
      .select('id, modulos_ativos')
      .eq('id', rodadaId)
      .maybeSingle()

    // RLS já garante isto: se não é do consultor, a linha nem aparece aqui.
    if (!rodada) return resposta({ ok: false, motivo: 'rodada_nao_encontrada' }, 404)

    const { data: perguntas, error: erroPerguntas } = await comoConsultor
      .from('perguntas')
      .select('id, codigo, dimensao, peso, invertida')
      .eq('ativa', true)
      .not('dimensao', 'is', null)

    if (erroPerguntas) throw erroPerguntas

    const perguntaPorId = new Map(
      (perguntas ?? []).map((p) => [
        p.id,
        { codigo: p.codigo as string, dimensao: p.dimensao as string, peso: Number(p.peso), invertida: Boolean(p.invertida) },
      ])
    )

    const { data: respondentes, error: erroRespondentes } = await comoConsultor
      .from('respondentes')
      .select('id, vinculo, area_principal')
      .eq('rodada_id', rodadaId)
      .eq('status', 'concluido')

    if (erroRespondentes) throw erroRespondentes

    const idsRespondentes = (respondentes ?? []).map((r) => r.id)

    const { data: respostasBrutas, error: erroRespostas } =
      idsRespondentes.length === 0
        ? { data: [], error: null }
        : await comoConsultor
            .from('respostas')
            .select('respondente_id, pergunta_id, nao_sei, nao_existe, valor_num')
            .in('respondente_id', idsRespondentes)

    if (erroRespostas) throw erroRespostas

    const respostasPorRespondente = new Map<string, ItemComDimensao[]>()
    for (const r of respostasBrutas ?? []) {
      const pergunta = perguntaPorId.get(r.pergunta_id)
      // Pergunta desativada depois de respondida, ou sem dimensão
      // (identificação/encerramento fora do eNPS): não entra no relatório.
      if (!pergunta) continue

      const item: ItemComDimensao = {
        codigo: pergunta.codigo,
        dimensao: pergunta.dimensao,
        peso: pergunta.peso,
        invertida: pergunta.invertida,
        naoSei: Boolean(r.nao_sei),
        naoExiste: Boolean(r.nao_existe),
        valor: r.valor_num === null ? null : Number(r.valor_num),
      }

      const lista = respostasPorRespondente.get(r.respondente_id) ?? []
      lista.push(item)
      respostasPorRespondente.set(r.respondente_id, lista)
    }

    const respondentesParaRelatorio: RespondenteParaRelatorio[] = (respondentes ?? []).map(
      (r) => ({
        id: r.id,
        vinculo: r.vinculo as VinculoRespondente | null,
        areaPrincipal: r.area_principal,
        itens: respostasPorRespondente.get(r.id) ?? [],
      })
    )

    const dimensoes = [...new Set((perguntas ?? []).map((p) => p.dimensao as string))].sort()
    const areas = [...(rodada.modulos_ativos as string[])].sort()

    const payload = montarPayloadRelatorio(respondentesParaRelatorio, dimensoes, areas)

    const modelo = Deno.env.get('OPENROUTER_REPORT_MODEL') ?? MODELO_RELATORIO_PADRAO
    const resultadoChat = await chatCompletion({
      model: modelo,
      system: SYSTEM_PROMPT_RELATORIO,
      user: construirMensagemUsuario(payload),
      temperature: 0.3,
    })

    const bruto = extrairJson(resultadoChat.conteudo)
    const narrativa = validarNarrativa(bruto)
    if (!narrativa) {
      console.error('gerar-relatorio: saída da IA fora do schema', resultadoChat.conteudo.slice(0, 500))
      return resposta({ ok: false, motivo: 'resposta_ia_invalida' }, 502)
    }

    // Só o insert final precisa de service role — não existe policy de
    // insert para authenticated em `relatorios` (de propósito).
    const servico = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })

    const { data: ultimoRelatorio } = await servico
      .from('relatorios')
      .select('versao')
      .eq('rodada_id', rodadaId)
      .order('versao', { ascending: false })
      .limit(1)
      .maybeSingle()

    const proximaVersao = (ultimoRelatorio?.versao ?? 0) + 1

    const { data: relatorio, error: erroInsert } = await servico
      .from('relatorios')
      .insert({
        rodada_id: rodadaId,
        versao: proximaVersao,
        scores: payload,
        narrativa,
        gerado_por: user.id,
      })
      .select('id, versao, scores, narrativa, gerado_em')
      .single()

    if (erroInsert) throw erroInsert

    return resposta({ ok: true, relatorio })
  } catch (e) {
    console.error('gerar-relatorio', e)
    return resposta({ ok: false, motivo: 'erro_interno' }, 500)
  }
})
