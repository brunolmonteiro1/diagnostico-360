/**
 * Leitura das respostas cruas de uma rodada — funções puras, sem I/O.
 *
 * Por que esta tela existe: com amostra pequena (n < 3) o relatório suprime
 * tudo, e com razão — não dá para afirmar padrão com uma pessoa. Mas o
 * consultor continua tendo o direito e a necessidade de LER o que foi
 * respondido: é dado do cliente dele, numa rodada dele, e a RLS já concede
 * `select` em `respondentes` e `respostas` para o dono. O que faltava era
 * superfície na UI, não permissão.
 *
 * A distinção que este arquivo preserva: consultor lendo o próprio dado é uma
 * coisa; texto identificado saindo para um serviço externo é outra. Por isso
 * `montarTextoParaIa` tem `incluirIdentificacao` — e o padrão é `false`.
 */

export type PerguntaExport = {
  id: string
  codigo: string
  enunciado: string
  dimensao: string | null
  bloco: string
  tipo: string
  ordem: number
  opcoes: { valor: string | number; rotulo: string }[] | null
}

export type RespondenteExport = {
  id: string
  nome: string | null
  email: string | null
  cargo: string | null
  areaPrincipal: string | null
  vinculo: string | null
  status: string
}

export type RespostaExport = {
  respondenteId: string
  perguntaId: string
  naoSei: boolean
  valorNum: number | null
  valorTexto: string | null
  valorOpcoes: string[] | null
}

export type RespostaComPergunta = RespostaExport & { pergunta: PerguntaExport }

export type GrupoRespondente = {
  respondente: RespondenteExport
  respostas: RespostaComPergunta[]
}

/**
 * Junta respondente + resposta + pergunta, na ordem em que as perguntas
 * aparecem no questionário. Respondente sem resposta nenhuma continua na
 * lista: "começou e não respondeu nada" é informação, não vazio a esconder.
 */
export function agruparPorRespondente(
  respondentes: readonly RespondenteExport[],
  respostas: readonly RespostaExport[],
  perguntas: readonly PerguntaExport[]
): GrupoRespondente[] {
  const perguntaPorId = new Map(perguntas.map((p) => [p.id, p]))

  return respondentes.map((respondente) => ({
    respondente,
    respostas: respostas
      .filter((r) => r.respondenteId === respondente.id)
      .flatMap((r) => {
        // Pergunta apagada do catálogo depois de respondida: sem enunciado, a
        // resposta é um número sem sentido — melhor omitir que exibir órfã.
        const pergunta = perguntaPorId.get(r.perguntaId)
        return pergunta ? [{ ...r, pergunta }] : []
      })
      .sort((a, b) => a.pergunta.ordem - b.pergunta.ordem),
  }))
}

/** Como uma resposta vira texto legível, respeitando o tipo da pergunta. */
export function formatarValor(r: RespostaComPergunta): string {
  // "Não sei" é resposta, não ausência — e nunca pode virar 0 ou vazio, senão
  // quem ler (humano ou IA) confunde com nota baixa.
  if (r.naoSei) return 'não sei'

  if (r.valorOpcoes !== null && r.valorOpcoes.length > 0) {
    return r.valorOpcoes.map((v) => rotuloDaOpcao(r.pergunta, v)).join(', ')
  }

  if (r.valorTexto !== null && r.valorTexto !== '') {
    return rotuloDaOpcao(r.pergunta, r.valorTexto)
  }

  if (r.valorNum !== null) {
    return r.pergunta.tipo === 'escala0a10'
      ? `${r.valorNum} (escala 0–10)`
      : String(r.valorNum)
  }

  return 'não respondida'
}

/** Traduz o valor gravado pelo rótulo que a pessoa viu na tela, quando houver. */
function rotuloDaOpcao(pergunta: PerguntaExport, valor: string | number): string {
  const opcao = pergunta.opcoes?.find((o) => String(o.valor) === String(valor))
  return opcao?.rotulo ?? String(valor)
}

export type OpcoesExportacao = {
  /**
   * Falso (padrão) troca a pessoa por "Respondente N" e omite nome e cargo.
   * Área e vínculo ficam: são o recorte analítico, não a identidade.
   */
  incluirIdentificacao: boolean
}

/**
 * Monta o texto para colar num chat de IA.
 *
 * E-mail nunca sai, nem com `incluirIdentificacao: true` — não existe uso
 * analítico para ele, e é o campo que mais facilmente vira dano se o texto
 * for parar no lugar errado.
 */
export function montarTextoParaIa(
  grupos: readonly GrupoRespondente[],
  { incluirIdentificacao }: OpcoesExportacao
): string {
  const linhas: string[] = [
    `# Respostas do diagnóstico — ${grupos.length} respondente(s)`,
    '',
    incluirIdentificacao
      ? 'Inclui identificação dos respondentes (escolha explícita do consultor).'
      : 'Respondentes anonimizados. Área e vínculo mantidos para permitir recorte.',
    '',
    'Observação metodológica: "não sei" é resposta válida e significa falta de',
    'visibilidade sobre o tema — nunca deve ser lido como nota baixa ou como zero.',
    'Itens marcados como invertidos não aparecem aqui espelhados: o valor é o que',
    'a pessoa marcou na tela.',
    '',
  ]

  grupos.forEach((grupo, i) => {
    const { respondente } = grupo

    linhas.push('---', '')
    linhas.push(
      incluirIdentificacao && respondente.nome
        ? `## ${respondente.nome}`
        : `## Respondente ${i + 1}`
    )

    const contexto = [
      incluirIdentificacao && respondente.cargo ? `cargo: ${respondente.cargo}` : null,
      respondente.areaPrincipal ? `área: ${respondente.areaPrincipal}` : null,
      respondente.vinculo ? `vínculo: ${respondente.vinculo}` : null,
      `status: ${respondente.status}`,
    ].filter((x): x is string => x !== null)

    linhas.push(contexto.join(' · '), '')

    if (grupo.respostas.length === 0) {
      linhas.push('_Nenhuma resposta registrada._', '')
      return
    }

    let blocoAtual = ''
    for (const r of grupo.respostas) {
      if (r.pergunta.bloco !== blocoAtual) {
        blocoAtual = r.pergunta.bloco
        linhas.push(`### ${blocoAtual}`, '')
      }

      const dimensao = r.pergunta.dimensao ? ` _(${r.pergunta.dimensao})_` : ''
      linhas.push(`- **${r.pergunta.codigo}**${dimensao} ${r.pergunta.enunciado}`)
      linhas.push(`  → ${formatarValor(r)}`)
    }
    linhas.push('')
  })

  return linhas.join('\n')
}
