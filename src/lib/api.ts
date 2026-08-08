import { supabase } from './supabase'
import type { Database } from './database.types'
import type { Convidado } from '@/domain/importar-convidados'

type Tabelas = Database['public']['Tables']

export type Cliente = Tabelas['clientes']['Row']
export type Rodada = Tabelas['rodadas']['Row']
export type Convite = Tabelas['convites']['Row']

/**
 * Acesso a dados do consultor. Nenhuma destas funções filtra por dono: quem faz
 * isso é a RLS, no banco. Acrescentar um `.eq('owner_id', …)` aqui daria a falsa
 * impressão de que a segurança mora no frontend.
 */

function erro(contexto: string, e: { message: string } | null): never {
  throw new Error(`${contexto}: ${e?.message ?? 'erro desconhecido'}`)
}

// --------------------------------------------------------------------------
// Clientes
// --------------------------------------------------------------------------

export async function listarClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nome_fantasia')

  if (error) erro('Não foi possível carregar os clientes', error)
  return data
}

export async function obterCliente(id: string): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) erro('Não foi possível carregar o cliente', error)
  return data
}

export type NovoCliente = {
  nome_fantasia: string
  razao_social?: string | null
  cnpj?: string | null
  segmento?: string | null
  porte?: string | null
  n_colaboradores?: number | null
  observacoes?: string | null
}

export async function criarCliente(
  dados: NovoCliente,
  ownerId: string
): Promise<Cliente> {
  // owner_id explícito porque a policy exige `with check (owner_id = auth.uid())`:
  // omitir aqui faria o insert ser recusado, não atribuído automaticamente.
  const { data, error } = await supabase
    .from('clientes')
    .insert({ ...dados, owner_id: ownerId })
    .select()
    .single()

  if (error) erro('Não foi possível criar o cliente', error)
  return data
}

export async function atualizarCliente(
  id: string,
  dados: Partial<NovoCliente>
): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .update(dados)
    .eq('id', id)
    .select()
    .single()

  if (error) erro('Não foi possível salvar o cliente', error)
  return data
}

export async function excluirCliente(id: string): Promise<void> {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) erro('Não foi possível excluir o cliente', error)
}

// --------------------------------------------------------------------------
// Rodadas
// --------------------------------------------------------------------------

export async function listarRodadas(clienteId: string): Promise<Rodada[]> {
  const { data, error } = await supabase
    .from('rodadas')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })

  if (error) erro('Não foi possível carregar as rodadas', error)
  return data
}

export async function obterRodada(id: string): Promise<Rodada> {
  const { data, error } = await supabase
    .from('rodadas')
    .select('*')
    .eq('id', id)
    .single()

  if (error) erro('Não foi possível carregar a rodada', error)
  return data
}

export type NovaRodada = {
  cliente_id: string
  titulo: string
  anonima?: boolean
  modulos_ativos?: string[]
  prazo_em?: string | null
  mensagem_abertura?: string | null
}

export async function criarRodada(dados: NovaRodada): Promise<Rodada> {
  const { data, error } = await supabase.from('rodadas').insert(dados).select().single()

  if (error) erro('Não foi possível criar a rodada', error)
  return data
}

export async function atualizarRodada(
  id: string,
  dados: Partial<Omit<NovaRodada, 'cliente_id'>> & {
    status?: Rodada['status']
    abertura_em?: string | null
  }
): Promise<Rodada> {
  const { data, error } = await supabase
    .from('rodadas')
    .update(dados)
    .eq('id', id)
    .select()
    .single()

  if (error) erro('Não foi possível salvar a rodada', error)
  return data
}

// --------------------------------------------------------------------------
// Convites
// --------------------------------------------------------------------------

export async function listarConvites(rodadaId: string): Promise<Convite[]> {
  const { data, error } = await supabase
    .from('convites')
    .select('*')
    .eq('rodada_id', rodadaId)
    .order('created_at')

  if (error) erro('Não foi possível carregar os convites', error)
  return data
}

/**
 * O token não é gerado aqui: o default da coluna é
 * `encode(gen_random_bytes(16),'hex')`. Gerar no navegador significaria
 * aleatoriedade de qualidade variável para o que é a credencial do respondente.
 */
export async function criarConvites(
  rodadaId: string,
  convidados: readonly Convidado[]
): Promise<Convite[]> {
  if (convidados.length === 0) return []

  const { data, error } = await supabase
    .from('convites')
    .insert(
      convidados.map((c) => ({
        rodada_id: rodadaId,
        email: c.email,
        nome_sugerido: c.nome,
      }))
    )
    .select()

  if (error) erro('Não foi possível criar os convites', error)
  return data
}

export async function excluirConvite(id: string): Promise<void> {
  const { error } = await supabase.from('convites').delete().eq('id', id)
  if (error) erro('Não foi possível excluir o convite', error)
}

// --------------------------------------------------------------------------
// Módulos de área
// --------------------------------------------------------------------------

/**
 * Os módulos disponíveis não são uma lista fixa no código: são as áreas que
 * realmente têm pergunta no banco. Enquanto a Fase 3 não semear as perguntas,
 * isto volta vazio — e vazio é a resposta correta, porque não faz sentido
 * ativar um módulo de área que não tem o que perguntar.
 */
export async function listarModulosDeArea(): Promise<string[]> {
  const { data, error } = await supabase
    .from('perguntas')
    .select('area_scope')
    .eq('bloco', 'area')
    .eq('ativa', true)

  if (error) erro('Não foi possível carregar os módulos de área', error)

  const areas = new Set<string>()
  for (const linha of data) {
    for (const area of linha.area_scope) areas.add(area)
  }

  return [...areas].sort()
}

// --------------------------------------------------------------------------
// Perguntas
// --------------------------------------------------------------------------

export type Pergunta = Tabelas['perguntas']['Row']

export async function listarPerguntas(): Promise<Pergunta[]> {
  const { data, error } = await supabase
    .from('perguntas')
    .select('*')
    .order('ordem')

  if (error) erro('Não foi possível carregar as perguntas', error)
  return data
}

// --------------------------------------------------------------------------
// Respondentes (acompanhamento)
// --------------------------------------------------------------------------

export type Respondente = Tabelas['respondentes']['Row']

export async function listarRespondentes(rodadaId: string): Promise<Respondente[]> {
  const { data, error } = await supabase
    .from('respondentes')
    .select('*')
    .eq('rodada_id', rodadaId)

  if (error) erro('Não foi possível carregar os respondentes', error)
  return data
}

// --------------------------------------------------------------------------
// Respostas cruas (leitura do consultor)
// --------------------------------------------------------------------------

/**
 * Tudo que é preciso para ler as respostas de uma rodada. Três consultas em
 * vez de um join porque o client do Supabase não expõe join de tabela sem
 * relação declarada — e porque a RLS avalia cada tabela por si de qualquer
 * forma (a de `respostas` desce até o dono via `owns_respondente`).
 */
export async function listarRespostasDaRodada(rodadaId: string): Promise<{
  respondentes: Respondente[]
  respostas: Tabelas['respostas']['Row'][]
  perguntas: Pergunta[]
}> {
  const respondentes = await listarRespondentes(rodadaId)

  const { data: perguntas, error: erroPerguntas } = await supabase
    .from('perguntas')
    .select('*')
    .order('ordem')

  if (erroPerguntas) erro('Não foi possível carregar as perguntas', erroPerguntas)

  if (respondentes.length === 0) return { respondentes, respostas: [], perguntas }

  const { data: respostas, error: erroRespostas } = await supabase
    .from('respostas')
    .select('*')
    .in(
      'respondente_id',
      respondentes.map((r) => r.id)
    )

  if (erroRespostas) erro('Não foi possível carregar as respostas', erroRespostas)

  return { respondentes, respostas, perguntas }
}

// --------------------------------------------------------------------------
// Relatório (Fase 6)
// --------------------------------------------------------------------------

export type Relatorio = Tabelas['relatorios']['Row']

/** O mais recente por `versao` — nunca apaga os anteriores, é histórico. */
export async function obterUltimoRelatorio(rodadaId: string): Promise<Relatorio | null> {
  const { data, error } = await supabase
    .from('relatorios')
    .select('*')
    .eq('rodada_id', rodadaId)
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) erro('Não foi possível carregar o relatório', error)
  return data
}

export async function obterRelatorio(id: string): Promise<Relatorio> {
  const { data, error } = await supabase.from('relatorios').select('*').eq('id', id).single()

  if (error) erro('Não foi possível carregar o relatório', error)
  return data
}

export type FalhaGeracaoRelatorio =
  | 'nao_autenticado'
  | 'requisicao_invalida'
  | 'rodada_nao_encontrada'
  | 'resposta_ia_invalida'
  | 'erro_interno'

/**
 * Chama a edge function que monta o payload agregado, gera a narrativa via IA
 * e grava uma nova versão. `supabase.functions.invoke` já encaminha o JWT da
 * sessão atual no cabeçalho Authorization — é assim que a function sabe quem
 * está pedindo e valida a posse da rodada pela RLS, sem lógica duplicada aqui.
 */
export async function gerarRelatorio(
  rodadaId: string
): Promise<{ ok: true; relatorio: Relatorio } | { ok: false; motivo: FalhaGeracaoRelatorio }> {
  const { data, error } = await supabase.functions.invoke('gerar-relatorio', {
    body: { rodada_id: rodadaId },
  })

  if (error) return { ok: false, motivo: 'erro_interno' }
  return data
}

/**
 * A narrativa editada pelo consultor é o que vai para a impressão — nunca a
 * saída bruta da IA sem revisão (critério de pronto da Fase 6).
 */
export async function salvarNarrativaEditada(
  relatorioId: string,
  narrativaEditada: Relatorio['narrativa']
): Promise<Relatorio> {
  const { data, error } = await supabase
    .from('relatorios')
    .update({ narrativa_editada: narrativaEditada, editado_manualmente: true })
    .eq('id', relatorioId)
    .select()
    .single()

  if (error) erro('Não foi possível salvar as edições do relatório', error)
  return data
}
