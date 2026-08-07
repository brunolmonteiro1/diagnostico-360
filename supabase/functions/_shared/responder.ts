/**
 * Base compartilhada das edge functions do respondente.
 *
 * O respondente NÃO faz login: o token é a credencial dele. Toda leitura e
 * gravação passa por aqui, com service role, depois de o token ser validado.
 * As tabelas de resposta nunca são expostas ao client sem autenticação — é por
 * isso que estas funções existem em vez de um `supabase.from()` no navegador.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Motivos que o front traduz em tela amigável. Nunca devolvemos 500 para eles. */
export type MotivoRecusa =
  | 'token_ausente'
  | 'token_invalido'
  | 'rodada_nao_encontrada'
  | 'rodada_nao_aberta'
  | 'rodada_encerrada'
  | 'prazo_encerrado'
  | 'excesso_de_requisicoes'
  | 'requisicao_invalida'

export function servico() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    // Service role: só existe aqui dentro, nunca chega ao navegador.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )
}

export function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/**
 * Recusa é 200 com motivo no corpo, não erro HTTP.
 *
 * Um token expirado não é falha do sistema — é uma situação prevista, e o
 * respondente precisa ver uma explicação, não uma tela de erro. Só problema
 * de verdade vira 5xx.
 */
export function recusa(motivo: MotivoRecusa, detalhe?: string): Response {
  return resposta({ ok: false, motivo, detalhe }, 200)
}

// ---------------------------------------------------------------------------
// Rate limit — 60 requisições por minuto, por token
// ---------------------------------------------------------------------------

const janelas = new Map<string, number[]>()
const LIMITE = 60
const JANELA_MS = 60_000

/**
 * Janela deslizante em memória. Como cada instância da edge function tem a
 * própria memória, o limite real é por instância — o suficiente para conter
 * autosave descontrolado e script ingênuo, que é o que se quer aqui. Não
 * confunda com proteção contra ataque distribuído.
 */
export function excedeuLimite(token: string): boolean {
  const agora = Date.now()
  const recentes = (janelas.get(token) ?? []).filter((t) => agora - t < JANELA_MS)

  if (recentes.length >= LIMITE) {
    janelas.set(token, recentes)
    return true
  }

  recentes.push(agora)
  janelas.set(token, recentes)

  // Evita crescer sem limite num processo de vida longa.
  if (janelas.size > 5_000) {
    for (const [chave, marcas] of janelas) {
      if (marcas.every((t) => agora - t >= JANELA_MS)) janelas.delete(chave)
    }
  }

  return false
}

// ---------------------------------------------------------------------------
// Validação do token
// ---------------------------------------------------------------------------

export type Contexto = {
  convite: { id: string; rodada_id: string; email: string | null; nome_sugerido: string | null }
  rodada: {
    id: string
    cliente_id: string
    titulo: string
    status: string
    anonima: boolean
    modulos_ativos: string[]
    prazo_em: string | null
    mensagem_abertura: string | null
  }
  cliente: { nome_fantasia: string }
}

export async function validarToken(
  cliente: ReturnType<typeof servico>,
  token: unknown,
  { exigirAberta = true }: { exigirAberta?: boolean } = {}
): Promise<{ ok: true; contexto: Contexto } | { ok: false; resposta: Response }> {
  if (typeof token !== 'string' || token.trim() === '') {
    return { ok: false, resposta: recusa('token_ausente') }
  }

  if (excedeuLimite(token)) {
    return { ok: false, resposta: recusa('excesso_de_requisicoes') }
  }

  const { data: convite } = await cliente
    .from('convites')
    .select('id, rodada_id, email, nome_sugerido')
    .eq('token', token)
    .maybeSingle()

  if (!convite) return { ok: false, resposta: recusa('token_invalido') }

  const { data: rodada } = await cliente
    .from('rodadas')
    .select(
      'id, cliente_id, titulo, status, anonima, modulos_ativos, prazo_em, mensagem_abertura'
    )
    .eq('id', convite.rodada_id)
    .maybeSingle()

  if (!rodada) return { ok: false, resposta: recusa('rodada_nao_encontrada') }

  if (exigirAberta && rodada.status !== 'aberta') {
    return {
      ok: false,
      resposta: recusa(
        rodada.status === 'encerrada' ? 'rodada_encerrada' : 'rodada_nao_aberta'
      ),
    }
  }

  // O prazo fecha a porta sozinho, sem depender de o consultor lembrar de
  // encerrar a rodada no dia certo.
  if (exigirAberta && rodada.prazo_em && new Date(rodada.prazo_em) < new Date()) {
    return { ok: false, resposta: recusa('prazo_encerrado') }
  }

  const { data: dadosCliente } = await cliente
    .from('clientes')
    .select('nome_fantasia')
    .eq('id', rodada.cliente_id)
    .maybeSingle()

  return {
    ok: true,
    contexto: {
      convite,
      rodada,
      cliente: { nome_fantasia: dadosCliente?.nome_fantasia ?? '' },
    },
  }
}

/** Lê o corpo JSON sem deixar um payload malformado virar 500. */
export async function corpoJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const dados = await req.json()
    return typeof dados === 'object' && dados !== null
      ? (dados as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}
