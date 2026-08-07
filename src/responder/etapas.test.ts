import { describe, expect, it } from 'vitest'
import { etapaDeRetomada, montarEtapas } from './etapas'
import type { PerguntaElegivel } from '@/domain/elegibilidade'

type P = PerguntaElegivel & { dimensao?: string | null }

const q = (over: Partial<P>): P => ({
  codigo: 'X.01',
  bloco: 'universal',
  areaScope: [],
  vinculoScope: [],
  ordem: 1,
  dimensao: 'papeis',
  ...over,
})

describe('montarEtapas', () => {
  it('sempre começa em abertura e termina em conclusão', () => {
    const etapas = montarEtapas([])

    expect(etapas.map((e) => e.tipo)).toEqual(['abertura', 'conclusao'])
  })

  it('dá uma tela por dimensão do bloco universal', () => {
    const etapas = montarEtapas([
      q({ codigo: 'D1.01', dimensao: 'papeis' }),
      q({ codigo: 'D2.01', dimensao: 'processos' }),
      q({ codigo: 'D3.01', dimensao: 'ferramentas' }),
    ])

    expect(etapas.filter((e) => e.tipo === 'universal')).toHaveLength(3)
    expect(etapas.map((e) => e.chave)).toContain('universal-papeis')
  })

  it('mantém a ordem das dimensões independentemente da ordem de entrada', () => {
    const etapas = montarEtapas([
      q({ codigo: 'D6.01', dimensao: 'pessoas' }),
      q({ codigo: 'D1.01', dimensao: 'papeis' }),
    ])

    expect(etapas.map((e) => e.chave)).toEqual([
      'abertura',
      'universal-papeis',
      'universal-pessoas',
      'conclusao',
    ])
  })

  it('não cria tela para dimensão sem pergunta', () => {
    // Tela vazia é pior que tela nenhuma: a pessoa avança sem entender.
    const etapas = montarEtapas([q({ codigo: 'D1.01', dimensao: 'papeis' })])

    expect(etapas.map((e) => e.chave)).not.toContain('universal-processos')
  })

  it('junta as abertas universais numa tela ao fim do bloco', () => {
    const etapas = montarEtapas([
      q({ codigo: 'D1.01', dimensao: 'papeis' }),
      q({ codigo: 'A.01', dimensao: null }),
      q({ codigo: 'A.02', dimensao: null }),
    ])

    const abertas = etapas.find((e) => e.chave === 'universal-abertas')
    expect(abertas?.perguntas).toHaveLength(2)
    expect(etapas.indexOf(abertas!)).toBeGreaterThan(
      etapas.findIndex((e) => e.chave === 'universal-papeis')
    )
  })

  it('não cria bloco de área quando não há pergunta de área', () => {
    // É o caso de quem escolheu diretoria ou outra.
    const etapas = montarEtapas([q({ codigo: 'D1.01' })])

    expect(etapas.some((e) => e.tipo === 'area')).toBe(false)
  })

  it('nomeia o bloco de área pela área da pessoa', () => {
    const etapas = montarEtapas([
      q({ codigo: 'FIN.01', bloco: 'area', areaScope: ['financeiro'], dimensao: null }),
    ])

    const area = etapas.find((e) => e.tipo === 'area')
    expect(area?.titulo).toBe('Financeiro')
    expect(area?.chave).toBe('area-financeiro')
  })

  it('não cria bloco de liderança para quem não tem', () => {
    const etapas = montarEtapas([q({ codigo: 'D1.01' })])

    expect(etapas.some((e) => e.tipo === 'lideranca')).toBe(false)
  })

  it('monta o fluxo inteiro na ordem certa', () => {
    const etapas = montarEtapas([
      q({ codigo: 'ID.01', bloco: 'identificacao', dimensao: null }),
      q({ codigo: 'D1.01', dimensao: 'papeis' }),
      q({ codigo: 'FIN.01', bloco: 'area', areaScope: ['financeiro'], dimensao: null }),
      q({ codigo: 'LID.01', bloco: 'lideranca', dimensao: null }),
      q({ codigo: 'FIM.01', bloco: 'encerramento', dimensao: null }),
    ])

    expect(etapas.map((e) => e.tipo)).toEqual([
      'abertura',
      'identificacao',
      'universal',
      'area',
      'lideranca',
      'encerramento',
      'conclusao',
    ])
  })
})

describe('etapaDeRetomada', () => {
  const etapas = montarEtapas([
    q({ codigo: 'ID.01', bloco: 'identificacao', dimensao: null }),
    q({ codigo: 'D1.01', dimensao: 'papeis' }),
    q({ codigo: 'D2.01', dimensao: 'processos' }),
  ])

  it('começa na abertura quando nada foi respondido', () => {
    expect(etapaDeRetomada(etapas, new Set())).toBe(1)
  })

  it('volta para a tela onde parou, não para a seguinte', () => {
    // Quem fechou o navegador no meio de uma tela volta para ela.
    const indice = etapaDeRetomada(etapas, new Set(['ID.01']))

    expect(etapas[indice].chave).toBe('universal-papeis')
  })

  it('pula as telas já completas', () => {
    const indice = etapaDeRetomada(etapas, new Set(['ID.01', 'D1.01']))

    expect(etapas[indice].chave).toBe('universal-processos')
  })

  it('para na última tela de perguntas quando tudo foi respondido', () => {
    // Não conclui sozinho: concluir é ato da pessoa.
    const indice = etapaDeRetomada(etapas, new Set(['ID.01', 'D1.01', 'D2.01']))

    expect(etapas[indice].tipo).not.toBe('conclusao')
    expect(etapas[indice].chave).toBe('universal-processos')
  })
})
