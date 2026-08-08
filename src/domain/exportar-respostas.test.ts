import { describe, expect, it } from 'vitest'
import {
  montarTextoParaIa,
  agruparPorRespondente,
  type PerguntaExport,
  type RespondenteExport,
  type RespostaExport,
} from './exportar-respostas'

const pergunta = (over: Partial<PerguntaExport> = {}): PerguntaExport => ({
  id: 'p1',
  codigo: 'D1.01',
  enunciado: 'As responsabilidades da minha área estão claras.',
  dimensao: 'papeis',
  bloco: 'universal',
  tipo: 'likert5',
  ordem: 101,
  opcoes: null,
  ...over,
})

const respondente = (over: Partial<RespondenteExport> = {}): RespondenteExport => ({
  id: 'r1',
  nome: 'Maria Aparecida Silva',
  email: 'maria@empresa.com.br',
  cargo: 'Analista Financeiro Sênior',
  areaPrincipal: 'financeiro',
  vinculo: 'colaborador',
  status: 'concluido',
  ...over,
})

const resposta = (over: Partial<RespostaExport> = {}): RespostaExport => ({
  respondenteId: 'r1',
  perguntaId: 'p1',
  naoSei: false,
  naoExiste: false,
  valorNum: 4,
  valorTexto: null,
  valorOpcoes: null,
  ...over,
})

describe('agruparPorRespondente', () => {
  it('junta cada resposta com a pergunta e o respondente certos', () => {
    const grupos = agruparPorRespondente(
      [respondente()],
      [resposta()],
      [pergunta()]
    )

    expect(grupos).toHaveLength(1)
    expect(grupos[0].respondente.nome).toBe('Maria Aparecida Silva')
    expect(grupos[0].respostas[0].pergunta.codigo).toBe('D1.01')
    expect(grupos[0].respostas[0].valorNum).toBe(4)
  })

  it('mantém o respondente que ainda não respondeu nada, com lista vazia', () => {
    const grupos = agruparPorRespondente([respondente()], [], [pergunta()])

    expect(grupos).toHaveLength(1)
    expect(grupos[0].respostas).toEqual([])
  })

  it('ordena as respostas pela ordem da pergunta, não pela ordem de chegada', () => {
    const grupos = agruparPorRespondente(
      [respondente()],
      [
        resposta({ perguntaId: 'p2' }),
        resposta({ perguntaId: 'p1' }),
      ],
      [pergunta({ id: 'p1', ordem: 101 }), pergunta({ id: 'p2', codigo: 'D2.01', ordem: 205 })]
    )

    expect(grupos[0].respostas.map((r) => r.pergunta.codigo)).toEqual(['D1.01', 'D2.01'])
  })

  it('descarta resposta cuja pergunta não existe mais no catálogo', () => {
    const grupos = agruparPorRespondente(
      [respondente()],
      [resposta({ perguntaId: 'pergunta-apagada' })],
      [pergunta()]
    )

    expect(grupos[0].respostas).toEqual([])
  })
})

describe('montarTextoParaIa — sem identificação (padrão seguro)', () => {
  const grupos = agruparPorRespondente([respondente()], [resposta()], [pergunta()])

  it('não vaza nome, e-mail nem cargo', () => {
    const texto = montarTextoParaIa(grupos, { incluirIdentificacao: false })

    expect(texto).not.toContain('Maria')
    expect(texto).not.toContain('maria@empresa.com.br')
    expect(texto).not.toContain('Analista Financeiro Sênior')
  })

  it('troca a pessoa por um rótulo sequencial estável', () => {
    const texto = montarTextoParaIa(grupos, { incluirIdentificacao: false })

    expect(texto).toContain('Respondente 1')
  })

  it('mantém área e vínculo, que são o recorte analítico', () => {
    const texto = montarTextoParaIa(grupos, { incluirIdentificacao: false })

    expect(texto).toContain('financeiro')
    expect(texto).toContain('colaborador')
  })

  it('mantém a resposta em si — é o dado que interessa', () => {
    const texto = montarTextoParaIa(grupos, { incluirIdentificacao: false })

    expect(texto).toContain('D1.01')
    expect(texto).toContain('4')
  })
})

describe('montarTextoParaIa — com identificação (escolha explícita do consultor)', () => {
  const grupos = agruparPorRespondente([respondente()], [resposta()], [pergunta()])

  it('inclui nome e cargo quando o consultor pede', () => {
    const texto = montarTextoParaIa(grupos, { incluirIdentificacao: true })

    expect(texto).toContain('Maria Aparecida Silva')
    expect(texto).toContain('Analista Financeiro Sênior')
  })

  it('nunca inclui e-mail, nem com identificação ligada', () => {
    // E-mail é credencial de contato, não dado de diagnóstico: não há caso de
    // uso analítico para ele e ele é o campo que mais facilmente vira spam ou
    // vazamento se o texto for parar no lugar errado.
    const texto = montarTextoParaIa(grupos, { incluirIdentificacao: true })

    expect(texto).not.toContain('maria@empresa.com.br')
  })
})

describe('montarTextoParaIa — como cada tipo de resposta é escrito', () => {
  const comResposta = (r: Partial<RespostaExport>, p: Partial<PerguntaExport> = {}) =>
    montarTextoParaIa(
      agruparPorRespondente([respondente()], [resposta(r)], [pergunta(p)]),
      { incluirIdentificacao: false }
    )

  it('escreve "não sei" por extenso, nunca como zero ou vazio', () => {
    const texto = comResposta({ naoSei: true, valorNum: null })

    expect(texto).toContain('não sei')
    expect(texto).not.toMatch(/D1\.01[^\n]*\b0\b/)
  })

  it('escreve o texto livre inteiro, sem truncar', () => {
    const longo = 'Acho que o maior problema é a falta de clareza sobre quem decide o quê.'
    const texto = comResposta(
      { valorNum: null, valorTexto: longo },
      { tipo: 'texto_longo' }
    )

    expect(texto).toContain(longo)
  })

  it('junta múltipla escolha numa lista legível', () => {
    const texto = comResposta(
      { valorNum: null, valorOpcoes: ['comercial', 'marketing'] },
      { tipo: 'multipla' }
    )

    expect(texto).toContain('comercial, marketing')
  })

  it('traduz o valor de escolha única pelo rótulo da opção, não pelo código', () => {
    const texto = comResposta(
      { valorNum: null, valorTexto: 'socio' },
      {
        tipo: 'unica',
        opcoes: [
          { valor: 'socio', rotulo: 'Sócio / Proprietário' },
          { valor: 'gestor', rotulo: 'Gestor / Líder de equipe' },
        ],
      }
    )

    expect(texto).toContain('Sócio / Proprietário')
  })

  it('marca a pergunta sem resposta como não respondida', () => {
    const grupos = agruparPorRespondente([respondente()], [], [pergunta()])
    const texto = montarTextoParaIa(grupos, { incluirIdentificacao: false })

    expect(texto).toContain('Respondente 1')
  })
})

describe('montarTextoParaIa — cabeçalho de contexto', () => {
  it('avisa quantos respondentes entraram no texto', () => {
    const grupos = agruparPorRespondente(
      [respondente({ id: 'a' }), respondente({ id: 'b', nome: 'João' })],
      [resposta({ respondenteId: 'a' }), resposta({ respondenteId: 'b' })],
      [pergunta()]
    )

    const texto = montarTextoParaIa(grupos, { incluirIdentificacao: false })

    expect(texto).toContain('2 respondente')
  })
})
