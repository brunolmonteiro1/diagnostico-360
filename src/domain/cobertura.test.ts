import { describe, expect, it } from 'vitest'
import { calcularCobertura, type RespondenteResumo } from './cobertura'

const r = (p: Partial<RespondenteResumo> = {}): RespondenteResumo => ({
  areaPrincipal: 'comercial',
  vinculo: 'colaborador',
  concluido: true,
  ...p,
})

describe('calcularCobertura', () => {
  it('conta convidados, iniciados e concluídos', () => {
    const c = calcularCobertura(10, [r(), r(), r({ concluido: false })])

    expect(c.convidados).toBe(10)
    expect(c.iniciados).toBe(3)
    expect(c.concluidos).toBe(2)
    expect(c.taxa).toBe(20)
  })

  it('não divide por zero sem convidado nenhum', () => {
    expect(calcularCobertura(0, []).taxa).toBeNull()
  })

  it('mostra a área que não respondeu, atrás de uma taxa geral boa', () => {
    // O caso que o cockpit existe para pegar: 80% no geral, financeiro zerado.
    const c = calcularCobertura(10, [
      ...Array.from({ length: 8 }, () => r({ areaPrincipal: 'comercial' })),
    ])

    expect(c.taxa).toBe(80)
    expect(c.porArea.map((a) => a.chave)).toEqual(['comercial'])
    expect(c.porArea.find((a) => a.chave === 'financeiro')).toBeUndefined()
  })

  it('marca o recorte que não vai aparecer no relatório', () => {
    const c = calcularCobertura(10, [
      r({ areaPrincipal: 'comercial' }),
      r({ areaPrincipal: 'comercial' }),
      r({ areaPrincipal: 'comercial' }),
      r({ areaPrincipal: 'financeiro' }),
      r({ areaPrincipal: 'financeiro' }),
    ])

    const comercial = c.porArea.find((a) => a.chave === 'comercial')!
    const financeiro = c.porArea.find((a) => a.chave === 'financeiro')!

    expect(comercial.abaixoDoMinimo).toBe(false)
    expect(financeiro.abaixoDoMinimo).toBe(true)
    expect(c.recortesSuprimidos).toContain('financeiro')
  })

  it('conta só concluídos para decidir supressão', () => {
    // Três iniciados e um concluído continua abaixo do mínimo: quem não
    // terminou não entra no relatório.
    const c = calcularCobertura(5, [
      r({ areaPrincipal: 'ti' }),
      r({ areaPrincipal: 'ti', concluido: false }),
      r({ areaPrincipal: 'ti', concluido: false }),
    ])

    const ti = c.porArea[0]
    expect(ti.iniciados).toBe(3)
    expect(ti.concluidos).toBe(1)
    expect(ti.abaixoDoMinimo).toBe(true)
  })

  it('quebra por vínculo além de por área', () => {
    const c = calcularCobertura(6, [
      r({ vinculo: 'socio' }),
      r({ vinculo: 'gestor' }),
      r({ vinculo: 'colaborador' }),
      r({ vinculo: 'colaborador' }),
    ])

    expect(c.porVinculo.map((v) => v.chave)).toEqual([
      'colaborador',
      'gestor',
      'socio',
    ])
    expect(c.porVinculo.find((v) => v.chave === 'colaborador')!.concluidos).toBe(2)
  })

  it('ignora quem ainda não declarou área ou vínculo', () => {
    // Quem abriu o link e parou antes da identificação não vira um grupo "null".
    const c = calcularCobertura(5, [
      r({ areaPrincipal: null, vinculo: null, concluido: false }),
      r({ areaPrincipal: 'comercial' }),
    ])

    expect(c.iniciados).toBe(2)
    expect(c.porArea).toHaveLength(1)
    expect(c.porVinculo).toHaveLength(1)
  })
})
