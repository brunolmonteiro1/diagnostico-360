import type { PayloadRelatorio } from './relatorio'

/**
 * Prompt de sistema e schema de saída da IA do relatório.
 *
 * Sem dependência nenhuma além de `./relatorio` (nem zod): este arquivo é
 * importado tanto pelo frontend (Vite/Node) quanto pela edge function
 * `gerar-relatorio` (Deno), e um pacote npm importado por especificador nu
 * ("zod") não resolve no Deno sem mapa de import. Validar à mão aqui evita
 * essa fragilidade nos dois lados.
 *
 * O texto do prompt abaixo foi reconstruído nesta sessão a partir das regras
 * já documentadas em CLAUDE.md/ARQUITETURA.md/PLANO.md (o texto original do
 * prompt da fase não está versionado no repositório). Se o texto literal
 * original existir em outro lugar, ele deve substituir este.
 */
export const SYSTEM_PROMPT_RELATORIO = `Você é o redator de um relatório de diagnóstico organizacional para uma consultoria (Ethos Lab). Você recebe SOMENTE dados agregados de uma rodada de diagnóstico — nunca resposta individual, nunca nome de pessoa, nunca texto livre de ninguém. Isso já foi filtrado antes de chegar a você; você não precisa (e não deve supor que pode) reidentificar ninguém a partir dos números.

Regras inegociáveis:
1. "Não sei" não é nota baixa. Um item com baixa visibilidade significa que a organização não tem dado suficiente sobre aquele ponto — não que o desempenho ali seja ruim. Nunca trate as duas coisas como sinônimos.
2. Você só afirma o que os dados agregados sustentam. Quando um campo do payload vier nulo (maturidade nula, gap nulo, eNPS nulo) ou como suprimido, escreva literalmente "dado insuficiente" para aquele ponto — nunca estime, nunca infira, nunca preencha a lacuna com suposição plausível.
3. Nunca escreva nome próprio, cargo específico que identifique uma única pessoa, nem cite frase que pareça resposta literal de alguém.
4. Você não teve acesso a nenhuma resposta aberta (texto livre) desta rodada — não invente citações nem temas que pareçam vir de texto livre.
5. Tom: direto, sóbrio, sem jargão de consultoria vazio. É um raio-x, não uma peça de venda. Áreas fracas são "oportunidades de formação" e "lacunas metodológicas", nunca acusação a uma pessoa ou a uma equipe.
6. Saída em JSON estrito, exatamente no schema pedido. Nenhum texto fora do JSON.

Schema de saída (todos os campos são obrigatórios; usar array vazio, nunca omitir a chave, quando não houver conteúdo):
{
  "sumario_executivo": string[],
  "diagnostico_por_dimensao": [{ "dimensao": string, "texto": string }],
  "achados_por_area": [{ "area": string, "texto": string }],
  "gargalos": string[],
  "riscos_criticos": string[],
  "o_que_funciona": string[],
  "iniciativas": string[],
  "lacunas_do_diagnostico": string[]
}

"lacunas_do_diagnostico" é onde você registra low-coverage: dimensões/áreas suprimidas por amostra pequena, eNPS sem base suficiente, gap hierárquico não calculável. Isso é conteúdo esperado, não falha do relatório.`

export type NarrativaRelatorio = {
  sumario_executivo: string[]
  diagnostico_por_dimensao: { dimensao: string; texto: string }[]
  achados_por_area: { area: string; texto: string }[]
  gargalos: string[]
  riscos_criticos: string[]
  o_que_funciona: string[]
  iniciativas: string[]
  lacunas_do_diagnostico: string[]
}

const CHAVES_STRING: (keyof NarrativaRelatorio)[] = [
  'sumario_executivo',
  'gargalos',
  'riscos_criticos',
  'o_que_funciona',
  'iniciativas',
  'lacunas_do_diagnostico',
]

function ehArrayDeString(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

function ehArrayDeBloco(v: unknown, chave: 'dimensao' | 'area'): boolean {
  return (
    Array.isArray(v) &&
    v.every(
      (x) =>
        x !== null &&
        typeof x === 'object' &&
        typeof (x as Record<string, unknown>)[chave] === 'string' &&
        typeof (x as Record<string, unknown>).texto === 'string' &&
        Object.keys(x as object).length === 2
    )
  )
}

/**
 * Valida a saída bruta da IA contra o schema esperado, à mão — sem zod (ver
 * nota no topo do arquivo). Rejeita campo a mais (ex.: a IA alucinou "nome"),
 * campo faltando, ou tipo errado. Retorna `null` em vez de lançar: uma saída
 * malformada é situação esperada de IA, não bug — quem chama decide o que
 * fazer (nunca persistir, por exemplo).
 */
export function validarNarrativa(bruto: unknown): NarrativaRelatorio | null {
  if (bruto === null || typeof bruto !== 'object') return null

  const obj = bruto as Record<string, unknown>
  const chavesEsperadas = new Set<string>([
    ...CHAVES_STRING,
    'diagnostico_por_dimensao',
    'achados_por_area',
  ])
  const chavesRecebidas = Object.keys(obj)

  if (chavesRecebidas.length !== chavesEsperadas.size) return null
  if (!chavesRecebidas.every((c) => chavesEsperadas.has(c))) return null

  if (!CHAVES_STRING.every((c) => ehArrayDeString(obj[c]))) return null
  if (!ehArrayDeBloco(obj.diagnostico_por_dimensao, 'dimensao')) return null
  if (!ehArrayDeBloco(obj.achados_por_area, 'area')) return null

  return obj as NarrativaRelatorio
}

/**
 * Serializa o payload (só agregados) como a mensagem de usuário enviada ao
 * modelo. Não recebe nada além do `PayloadRelatorio` — não tem como vazar
 * campo identificado porque o tipo de entrada não tem onde guardar um.
 */
export function construirMensagemUsuario(payload: PayloadRelatorio): string {
  return [
    'Dados agregados da rodada de diagnóstico (JSON). Gere o relatório no schema definido no prompt de sistema.',
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n')
}
