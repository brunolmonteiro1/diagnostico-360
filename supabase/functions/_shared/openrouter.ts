/**
 * Cliente OpenRouter para as edge functions (Deno). Chave via secret
 * OPENROUTER_API_KEY — nunca chega ao bundle do frontend.
 */
const BASE_URL = Deno.env.get('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1'

/** Modelo padrão de relatório — trocável por secret sem precisar de deploy de código novo. */
export const MODELO_RELATORIO_PADRAO = 'anthropic/claude-sonnet-4.5'

export type ResultadoChat = { conteudo: string; modelo: string }

export async function chatCompletion(opts: {
  model: string
  system: string
  user: string
  temperature: number
  timeoutMs?: number
}): Promise<ResultadoChat> {
  const key = Deno.env.get('OPENROUTER_API_KEY')
  if (!key) throw new Error('OPENROUTER_API_KEY não configurada nos secrets da edge function')

  const corpo = {
    model: opts.model,
    temperature: opts.temperature,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
  }

  const tentar = async (): Promise<Response> => {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000)
    try {
      return await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/brunolmonteiro1/diagnostico-360',
          'X-Title': 'Diagnostico 360 - Ethos Lab',
        },
        body: JSON.stringify(corpo),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(t)
    }
  }

  let res = await tentar()
  if (res.status === 429 || res.status >= 500) {
    await new Promise((r) => setTimeout(r, 3000))
    res = await tentar()
  }
  if (!res.ok) {
    const texto = await res.text().catch(() => '')
    throw new Error(`OpenRouter ${res.status}: ${texto.slice(0, 300)}`)
  }

  const json = await res.json()
  const conteudo: string | undefined = json?.choices?.[0]?.message?.content
  if (!conteudo) throw new Error(`Resposta sem conteúdo: ${JSON.stringify(json).slice(0, 300)}`)

  return { conteudo, modelo: json.model ?? opts.model }
}

/** Extrai o objeto JSON da resposta, tolerando cercas ```json e texto ao redor. */
export function extrairJson(conteudo: string): unknown {
  const aparado = conteudo.trim()
  const cercado = aparado.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidato = cercado ? cercado[1] : aparado
  try {
    return JSON.parse(candidato)
  } catch {
    const inicio = candidato.indexOf('{')
    const fim = candidato.lastIndexOf('}')
    if (inicio === -1 || fim <= inicio) throw new Error('Resposta não contém JSON')
    return JSON.parse(candidato.slice(inicio, fim + 1))
  }
}
