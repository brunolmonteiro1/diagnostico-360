import { describe, expect, it } from 'vitest'
import {
  aceitaRespostas,
  impedimentosParaAbrir,
  podeTransicionar,
  transicoesDe,
} from './rodada-status'

describe('ciclo de vida da rodada', () => {
  it('vai de rascunho para aberta', () => {
    expect(podeTransicionar('rascunho', 'aberta')).toBe(true)
  })

  it('vai de aberta para encerrada', () => {
    expect(podeTransicionar('aberta', 'encerrada')).toBe(true)
  })

  it('não volta de aberta para rascunho', () => {
    // O link já circulou: deixou de ser rascunho de fato.
    expect(podeTransicionar('aberta', 'rascunho')).toBe(false)
  })

  it('não reabre rodada encerrada', () => {
    // Reabrir mudaria o denominador de um diagnóstico já apresentado.
    expect(podeTransicionar('encerrada', 'aberta')).toBe(false)
  })

  it('não faz nada a partir de arquivada', () => {
    expect(transicoesDe('arquivada')).toEqual([])
  })

  it('não pula de rascunho direto para encerrada', () => {
    expect(podeTransicionar('rascunho', 'encerrada')).toBe(false)
  })

  it('aceita resposta apenas enquanto aberta', () => {
    expect(aceitaRespostas('aberta')).toBe(true)
    expect(aceitaRespostas('rascunho')).toBe(false)
    expect(aceitaRespostas('encerrada')).toBe(false)
    expect(aceitaRespostas('arquivada')).toBe(false)
  })
})

describe('impedimentosParaAbrir', () => {
  it('avisa quando não há convidado', () => {
    const p = impedimentosParaAbrir({ totalConvites: 0, modulosAtivos: ['financeiro'] })

    expect(p).toHaveLength(1)
    expect(p[0]).toContain('Nenhum convidado')
  })

  it('avisa quando não há módulo de área', () => {
    const p = impedimentosParaAbrir({ totalConvites: 5, modulosAtivos: [] })

    expect(p).toHaveLength(1)
    expect(p[0]).toContain('Nenhum módulo')
  })

  it('não avisa nada quando está pronta', () => {
    expect(
      impedimentosParaAbrir({ totalConvites: 5, modulosAtivos: ['financeiro'] })
    ).toEqual([])
  })
})
