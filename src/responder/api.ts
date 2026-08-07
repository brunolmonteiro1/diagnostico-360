import { env } from '@/lib/env'

/**
 * Cliente das edge functions do respondente.
 *
 * Note que NÃO existe `supabase.from()` em lugar nenhum de `src/responder/`.
 * O respondente não tem sessão: se este arquivo passar a falar direto com as
 * tabelas, o modelo de segurança foi quebrado.
 */

const BASE = `${env.VITE_SUPABASE_URL}/functions/v1`

export type MotivoRecusa =
  | 'token_ausente'
  | 'token_invalido'
  | 'rodada_nao_encontrada'
  | 'rodada_nao_aberta'
  | 'rodada_encerrada'
  | 'prazo_encerrado'
  | 'excesso_de_requisicoes'
  | 'requisicao_invalida'
  | 'erro_interno'
  | 'sem_conexao'

export type PerguntaServidor = {
  id: string
  codigo: string
  bloco: 'identificacao' | 'universal' | 'area' | 'lideranca' | 'encerramento'
  dimensao: string | null
  area_scope: string[]
  vinculo_scope: string[]
  ordem: number
  enunciado: string
  ajuda: string | null
  tipo:
    | 'likert5'
    | 'frequencia5'
    | 'escala0a10'
    | 'unica'
    | 'multipla'
    | 'texto_curto'
    | 'texto_longo'
    | 'numero'
  opcoes: { valor: string | number; rotulo: string }[] | null
  permite_nao_sei: boolean
  obrigatoria: boolean
}

export type RespostaServidor = {
  pergunta_id: string
  nao_sei: boolean
  valor_num: number | null
  valor_texto: string | null
  valor_opcoes: string[] | null
}

export type Inicio = {
  ok: true
  rodada: {
    id: string
    titulo: string
    anonima: boolean
    modulosAtivos: string[]
    prazoEm: string | null
    mensagemAbertura: string | null
  }
  empresa: string
  respondente: {
    id: string
    nome: string | null
    email: string | null
    cargo: string | null
    areaPrincipal: string | null
    areasSecundarias: string[]
    vinculo: string | null
    tempoEmpresa: string | null
    reportaPara: string | null
    nLiderados: number | null
    consentimentoLgpd: boolean
    status: 'em_andamento' | 'concluido'
  }
  perguntas: PerguntaServidor[]
  respostas: RespostaServidor[]
}

export type Recusa = { ok: false; motivo: MotivoRecusa; detalhe?: string }

async function chamar<T>(funcao: string, corpo: unknown): Promise<T | Recusa> {
  try {
    const resposta = await fetch(`${BASE}/${funcao}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(corpo),
    })

    if (!resposta.ok) return { ok: false, motivo: 'erro_interno' }

    return (await resposta.json()) as T | Recusa
  } catch {
    // Sem rede: quem está respondendo precisa saber que o que digitou pode não
    // ter sido salvo, em vez de continuar achando que sim.
    return { ok: false, motivo: 'sem_conexao' }
  }
}

export function iniciar(token: string) {
  return chamar<Inicio>('responder-inicio', { token })
}

export function salvarResposta(
  token: string,
  entrada: {
    pergunta_id: string
    nao_sei?: boolean
    valor_num?: number | null
    valor_texto?: string | null
    valor_opcoes?: string[] | null
  }
) {
  return chamar<{ ok: true }>('responder-salvar', { token, ...entrada })
}

export function salvarPerfil(token: string, perfil: Record<string, unknown>) {
  return chamar<{ ok: true }>('responder-salvar', { token, perfil })
}

export function concluir(token: string) {
  return chamar<{ ok: true; jaConcluido: boolean }>('responder-concluir', { token })
}

export const MENSAGEM_RECUSA: Record<MotivoRecusa, { titulo: string; texto: string }> = {
  token_ausente: {
    titulo: 'Link incompleto',
    texto: 'O endereço parece ter sido cortado. Copie o link inteiro do convite.',
  },
  token_invalido: {
    titulo: 'Link não reconhecido',
    texto:
      'Este link não corresponde a nenhum convite. Confira se copiou o endereço completo, ou peça um novo a quem te convidou.',
  },
  rodada_nao_encontrada: {
    titulo: 'Questionário indisponível',
    texto: 'Não encontramos este questionário. Avise quem te enviou o link.',
  },
  rodada_nao_aberta: {
    titulo: 'Ainda não começou',
    texto: 'Este questionário ainda não foi aberto. Guarde o link: ele continua valendo.',
  },
  rodada_encerrada: {
    titulo: 'Questionário encerrado',
    texto:
      'A coleta de respostas foi encerrada. Se você tinha algo a registrar, fale com quem te convidou.',
  },
  prazo_encerrado: {
    titulo: 'Prazo encerrado',
    texto:
      'O prazo para responder terminou. Se ainda quiser participar, fale com quem te convidou.',
  },
  excesso_de_requisicoes: {
    titulo: 'Devagar um instante',
    texto: 'Recebemos muitas solicitações deste link. Espere alguns segundos e tente de novo.',
  },
  requisicao_invalida: {
    titulo: 'Algo saiu do lugar',
    texto: 'Recarregue a página. Suas respostas anteriores foram salvas.',
  },
  erro_interno: {
    titulo: 'Falha temporária',
    texto: 'Tivemos um problema aqui. Tente de novo em instantes — nada do que você respondeu se perdeu.',
  },
  sem_conexao: {
    titulo: 'Sem conexão',
    texto: 'Não conseguimos falar com o servidor. Verifique sua internet e tente de novo.',
  },
}
