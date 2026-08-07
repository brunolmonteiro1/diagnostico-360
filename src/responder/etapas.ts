import type { PerguntaElegivel } from '@/domain/elegibilidade'

/**
 * Monta as telas do questionário a partir das perguntas aplicáveis ao perfil.
 *
 * Função pura. O fluxo tem 7 blocos — abertura, identificação, universal (uma
 * tela por dimensão), área, liderança, encerramento e conclusão —, e os
 * condicionais simplesmente não existem quando não há pergunta para eles. Uma
 * tela vazia é pior que tela nenhuma: a pessoa avança sem entender o que
 * aconteceu.
 */

export type TipoEtapa =
  | 'abertura'
  | 'identificacao'
  | 'universal'
  | 'area'
  | 'lideranca'
  | 'encerramento'
  | 'conclusao'

export type Etapa<T extends PerguntaElegivel = PerguntaElegivel> = {
  tipo: TipoEtapa
  /** Identificador estável, usado para retomar no ponto exato. */
  chave: string
  titulo: string
  subtitulo?: string
  perguntas: T[]
}

/** Ordem e rótulo das dimensões do bloco universal, uma tela cada. */
const DIMENSOES_UNIVERSAIS: ReadonlyArray<{ chave: string; titulo: string }> = [
  { chave: 'papeis', titulo: 'Clareza de papéis' },
  { chave: 'processos', titulo: 'Processos e padronização' },
  { chave: 'ferramentas', titulo: 'Ferramentas e sistemas' },
  { chave: 'comunicacao', titulo: 'Comunicação e informação' },
  { chave: 'lideranca', titulo: 'Liderança e decisão' },
  { chave: 'pessoas', titulo: 'Pessoas, cultura e capacitação' },
]

const ROTULO_AREA: Readonly<Record<string, string>> = {
  comercial: 'Comercial e vendas',
  marketing: 'Marketing',
  operacional: 'Operacional e backoffice',
  atendimento: 'Atendimento e pós-venda',
  financeiro: 'Financeiro',
  admrh: 'Administrativo e RH',
  ti: 'TI e sistemas',
  juridico: 'Jurídico e contratos',
  franqueadora: 'Relacionamento com a franqueadora',
}

export function rotuloDaArea(area: string): string {
  return ROTULO_AREA[area] ?? area
}

export function montarEtapas<T extends PerguntaElegivel & { dimensao?: string | null }>(
  aplicaveis: readonly T[]
): Etapa<T>[] {
  const etapas: Etapa<T>[] = [
    {
      tipo: 'abertura',
      chave: 'abertura',
      titulo: 'Antes de começar',
      perguntas: [],
    },
  ]

  const doBloco = (bloco: string) => aplicaveis.filter((p) => p.bloco === bloco)

  const identificacao = doBloco('identificacao')
  if (identificacao.length > 0) {
    etapas.push({
      tipo: 'identificacao',
      chave: 'identificacao',
      titulo: 'Sobre você',
      subtitulo: 'Serve para cruzarmos as respostas por área e por função.',
      perguntas: identificacao,
    })
  }

  const universais = doBloco('universal')

  for (const dimensao of DIMENSOES_UNIVERSAIS) {
    const perguntas = universais.filter((p) => p.dimensao === dimensao.chave)
    if (perguntas.length === 0) continue

    etapas.push({
      tipo: 'universal',
      chave: `universal-${dimensao.chave}`,
      titulo: dimensao.titulo,
      perguntas,
    })
  }

  // As abertas do bloco universal não têm dimensão. Vão para o fim do bloco,
  // depois de a pessoa já ter pensado sobre cada tema.
  const abertasUniversais = universais.filter(
    (p) => !p.dimensao || !DIMENSOES_UNIVERSAIS.some((d) => d.chave === p.dimensao)
  )

  if (abertasUniversais.length > 0) {
    etapas.push({
      tipo: 'universal',
      chave: 'universal-abertas',
      titulo: 'Na sua experiência',
      subtitulo: 'Pode escrever à vontade, ou pular o que não quiser responder.',
      perguntas: abertasUniversais,
    })
  }

  const area = doBloco('area')
  if (area.length > 0) {
    const slug = area[0].areaScope[0]
    etapas.push({
      tipo: 'area',
      chave: `area-${slug}`,
      titulo: rotuloDaArea(slug),
      subtitulo: 'Perguntas específicas da sua área.',
      perguntas: area,
    })
  }

  const lideranca = doBloco('lideranca')
  if (lideranca.length > 0) {
    etapas.push({
      tipo: 'lideranca',
      chave: 'lideranca',
      titulo: 'Gestão do negócio',
      subtitulo: 'Você vê estas perguntas por ser sócio ou gestor.',
      perguntas: lideranca,
    })
  }

  const encerramento = doBloco('encerramento')
  if (encerramento.length > 0) {
    etapas.push({
      tipo: 'encerramento',
      chave: 'encerramento',
      titulo: 'Para terminar',
      perguntas: encerramento,
    })
  }

  etapas.push({
    tipo: 'conclusao',
    chave: 'conclusao',
    titulo: 'Concluído',
    perguntas: [],
  })

  return etapas
}

/**
 * Índice da etapa onde a pessoa parou.
 *
 * Retoma na primeira etapa com pergunta ainda sem resposta — e não na última
 * visitada. Quem fechou o navegador no meio de uma tela volta para ela, não
 * para depois dela.
 */
export function etapaDeRetomada<T extends PerguntaElegivel>(
  etapas: readonly Etapa<T>[],
  respondidas: ReadonlySet<string>
): number {
  const primeiraPendente = etapas.findIndex(
    (etapa) =>
      etapa.perguntas.length > 0 &&
      etapa.perguntas.some((p) => !respondidas.has(p.codigo))
  )

  if (primeiraPendente !== -1) return primeiraPendente

  // Tudo respondido: manda para a última etapa antes da conclusão, para a
  // pessoa revisar e concluir por vontade própria.
  return Math.max(0, etapas.length - 2)
}
