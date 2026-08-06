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
