import { describe, expect, it } from 'vitest'
import {
  CODIGO_ENPS,
  montarPayloadRelatorio,
  type RespondenteParaRelatorio,
} from './relatorio'

/**
 * Item pontuável de uma dimensão, já resolvido (o que elegibilidade.ts +
 * respostas produziriam). `valor` em escala 1–5, exceto o item de eNPS.
 */
const item = (
  over: Partial<RespondenteParaRelatorio['itens'][number]> = {}
): RespondenteParaRelatorio['itens'][number] => ({
  codigo: 'D1.01',
  dimensao: 'papeis',
  peso: 1,
  invertida: false,
  naoSei: false,
  valor: 4,
  ...over,
})

const respondente = (
  over: Partial<RespondenteParaRelatorio> = {}
): RespondenteParaRelatorio => ({
  id: 'r1',
  vinculo: 'colaborador',
  areaPrincipal: 'financeiro',
  itens: [item()],
  ...over,
})

describe('montarPayloadRelatorio — estrutura sem dado individual', () => {
  it('o payload não tem NENHUM campo capaz de carregar nome, e-mail ou id de respondente', () => {
    const payload = montarPayloadRelatorio(
      [respondente({ id: 'respondente-secreto-123' })],
      ['papeis'],
      ['financeiro']
    )

    const serializado = JSON.stringify(payload)

    expect(serializado).not.toContain('respondente-secreto-123')
    expect(serializado).not.toMatch(/nome|email|e-mail/i)
  })

  it('expõe só números e agregados por dimensão/área', () => {
    const payload = montarPayloadRelatorio(
      [respondente()],
      ['papeis'],
      ['financeiro']
    )

    expect(payload).toEqual({
      totalRespondentes: 1,
      dimensoes: expect.any(Array),
      heatmap: expect.any(Array),
      enps: null,
    })
  })
})

describe('montarPayloadRelatorio — rodada de teste (2 respondentes) produz dado insuficiente', () => {
  it('nenhuma dimensão emite maturidade com só 2 respondentes', () => {
    const payload = montarPayloadRelatorio(
      [
        respondente({ id: 'a', vinculo: 'colaborador' }),
        respondente({ id: 'b', vinculo: 'gestor' }),
      ],
      ['papeis'],
      ['financeiro']
    )

    const papeis = payload.dimensoes.find((d) => d.dimensao === 'papeis')!
    expect(papeis.geral.suprimido).toBe(true)
    expect(papeis.geral.maturidade).toBeNull()
  })

  it('eNPS fica nulo com menos de 5 notas', () => {
    const payload = montarPayloadRelatorio(
      [
        respondente({ id: 'a', itens: [item({ codigo: CODIGO_ENPS, valor: 9, peso: 0 })] }),
        respondente({ id: 'b', itens: [item({ codigo: CODIGO_ENPS, valor: 8, peso: 0 })] }),
      ],
      ['papeis'],
      ['financeiro']
    )

    expect(payload.enps).toBeNull()
  })
})

describe('montarPayloadRelatorio — visibilidade abaixo de 40%', () => {
  it('não emite maturidade quando a maioria respondeu "não sei"', () => {
    const tresRespondentes = [
      respondente({ id: 'a', itens: [item({ naoSei: true, valor: null })] }),
      respondente({ id: 'b', itens: [item({ naoSei: true, valor: null })] }),
      respondente({ id: 'c', itens: [item({ valor: 5 })] }),
    ]

    const payload = montarPayloadRelatorio(tresRespondentes, ['papeis'], ['financeiro'])
    const papeis = payload.dimensoes.find((d) => d.dimensao === 'papeis')!

    // visibilidade = 1/3 = 33.3% < 40%
    expect(papeis.geral.confiavel).toBe(false)
    expect(papeis.geral.maturidade).toBeNull()
  })
})

describe('montarPayloadRelatorio — heatmap área × dimensão', () => {
  it('célula com menos de 3 respondentes na área vem suprimida', () => {
    const payload = montarPayloadRelatorio(
      [
        respondente({ id: 'a', areaPrincipal: 'financeiro' }),
        respondente({ id: 'b', areaPrincipal: 'ti' }),
      ],
      ['papeis'],
      ['financeiro', 'ti']
    )

    const celulaFinanceiro = payload.heatmap.find(
      (c) => c.area === 'financeiro' && c.dimensao === 'papeis'
    )!
    expect(celulaFinanceiro.resultado.suprimido).toBe(true)
    expect(celulaFinanceiro.resultado.maturidade).toBeNull()
  })

  it('gera uma célula para cada combinação de área × dimensão pedida', () => {
    const payload = montarPayloadRelatorio(
      [respondente()],
      ['papeis', 'pessoas'],
      ['financeiro', 'ti']
    )

    expect(payload.heatmap).toHaveLength(4)
  })
})

describe('montarPayloadRelatorio — gap hierárquico por dimensão', () => {
  it('calcula o gap quando liderança e equipe têm amostra suficiente', () => {
    const respondentes: RespondenteParaRelatorio[] = [
      respondente({ id: 's1', vinculo: 'socio', itens: [item({ valor: 5 })] }),
      respondente({ id: 's2', vinculo: 'socio', itens: [item({ valor: 5 })] }),
      respondente({ id: 'g1', vinculo: 'gestor', itens: [item({ valor: 5 })] }),
      respondente({ id: 'c1', vinculo: 'colaborador', itens: [item({ valor: 1 })] }),
      respondente({ id: 'c2', vinculo: 'colaborador', itens: [item({ valor: 1 })] }),
      respondente({ id: 'c3', vinculo: 'colaborador', itens: [item({ valor: 1 })] }),
    ]

    const payload = montarPayloadRelatorio(respondentes, ['papeis'], [])
    const papeis = payload.dimensoes.find((d) => d.dimensao === 'papeis')!

    // liderança pontua 100 (valor 5), equipe pontua 0 (valor 1) → gap = 100
    expect(papeis.gapHierarquico).toBe(100)
  })

  it('fica nulo quando um dos lados está suprimido por amostra pequena', () => {
    const respondentes: RespondenteParaRelatorio[] = [
      respondente({ id: 's1', vinculo: 'socio' }),
      respondente({ id: 'c1', vinculo: 'colaborador' }),
      respondente({ id: 'c2', vinculo: 'colaborador' }),
      respondente({ id: 'c3', vinculo: 'colaborador' }),
    ]

    const payload = montarPayloadRelatorio(respondentes, ['papeis'], [])
    const papeis = payload.dimensoes.find((d) => d.dimensao === 'papeis')!

    // só 1 sócio/gestor: lideranca fica suprimida (n < 3) → gap não pode ser calculado
    expect(papeis.lideranca.suprimido).toBe(true)
    expect(papeis.gapHierarquico).toBeNull()
  })
})
