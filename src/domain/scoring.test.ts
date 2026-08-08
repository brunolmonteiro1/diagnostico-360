import { describe, expect, it } from 'vitest'
import {
  LIMIAR_VISIBILIDADE,
  MINIMO_ENPS,
  MINIMO_RECORTE,
  calcularEnps,
  calcularGapHierarquico,
  calcularRecorte,
  normalizarItem,
  type Item,
} from './scoring'

const item = (p: Partial<Item> = {}): Item => ({
  codigo: 'D1.01',
  peso: 1,
  invertida: false,
  naoSei: false,
  naoExiste: false,
  valor: 3,
  ...p,
})

/** Atalho: um recorte com respondentes suficientes, para não repetir n em todo teste. */
const recorte = (itens: Item[], n = 5) => calcularRecorte(itens, n)

// ---------------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------------

describe('normalizarItem', () => {
  it('mapeia a escala 1–5 para 0–100', () => {
    expect(normalizarItem(item({ valor: 1 }))).toBe(0)
    expect(normalizarItem(item({ valor: 3 }))).toBe(50)
    expect(normalizarItem(item({ valor: 5 }))).toBe(100)
  })

  it('espelha a pergunta invertida antes de pontuar', () => {
    // "Executo tarefas que deveriam ser de outra pessoa" respondida "nunca" (1)
    // é o melhor cenário possível, e tem que valer 100.
    expect(normalizarItem(item({ valor: 1, invertida: true }))).toBe(100)
    expect(normalizarItem(item({ valor: 5, invertida: true }))).toBe(0)
    expect(normalizarItem(item({ valor: 3, invertida: true }))).toBe(50)
  })

  it('não pontua "não sei"', () => {
    expect(normalizarItem(item({ naoSei: true, valor: null }))).toBeNull()
  })

  it('não pontua pergunta sem resposta', () => {
    expect(normalizarItem(item({ valor: null }))).toBeNull()
  })

  it('pontua "não existe atualmente" no piso da escala', () => {
    // "Sei que não temos DRE" é achado, não falta de dado: vale 0 e ENTRA na
    // conta. Tratar como "não sei" esconderia o problema justamente na empresa
    // onde ele é mais grave.
    expect(normalizarItem(item({ naoExiste: true, valor: null }))).toBe(0)
  })

  it('"não existe" ignora a inversão da pergunta', () => {
    // Inverter faz sentido para "com que frequência você refaz trabalho" — não
    // para a ausência do processo. Processo inexistente é o pior caso nos dois
    // sentidos; espelhar daria 100 para quem não tem nada.
    expect(normalizarItem(item({ naoExiste: true, valor: null, invertida: true }))).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Regra dura — "não existe" é resposta, "não sei" é ausência
//
// A distinção que separa as duas: quem responde "não existe" TEM visibilidade
// sobre o tema (sabe que não há processo). Só o "não sei" derruba a
// visibilidade.
// ---------------------------------------------------------------------------

describe('"não existe atualmente" vs "não sei"', () => {
  it('"não existe" conta como item válido e não derruba a visibilidade', () => {
    const r = recorte([
      item({ naoExiste: true, valor: null }),
      item({ codigo: 'D1.02', valor: 5 }),
    ])

    expect(r.visibilidade).toBe(100)
    expect(r.itensValidos).toBe(2)
  })

  it('"não sei" continua derrubando a visibilidade', () => {
    const r = recorte([
      item({ naoSei: true, valor: null }),
      item({ codigo: 'D1.02', valor: 5 }),
    ])

    expect(r.visibilidade).toBe(50)
    expect(r.itensValidos).toBe(1)
  })

  it('"não existe" puxa a maturidade para baixo; "não sei" apenas some da conta', () => {
    const comNaoExiste = recorte([
      item({ naoExiste: true, valor: null }),
      item({ codigo: 'D1.02', valor: 5 }),
    ])
    const comNaoSei = recorte([
      item({ naoSei: true, valor: null }),
      item({ codigo: 'D1.02', valor: 5 }),
    ])

    // média(0, 100) = 50 contra média(100) = 100
    expect(comNaoExiste.maturidade).toBe(50)
    expect(comNaoSei.maturidade).toBe(100)
  })

  it('recorte inteiro de "não existe" dá maturidade 0 com visibilidade cheia', () => {
    // O retrato de uma área sem processo nenhum: a empresa sabe exatamente o
    // que não tem. Visibilidade alta, maturidade no chão — e é verdade.
    const r = recorte([
      item({ naoExiste: true, valor: null }),
      item({ codigo: 'D1.02', naoExiste: true, valor: null }),
      item({ codigo: 'D1.03', naoExiste: true, valor: null }),
    ])

    expect(r.visibilidade).toBe(100)
    expect(r.maturidade).toBe(0)
    expect(r.confiavel).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Regra dura 1 — "não sei" fora da maturidade
// ---------------------------------------------------------------------------

describe('"não sei" não vira nota baixa', () => {
  it('não altera a maturidade, mas reduz a visibilidade', () => {
    const semNaoSei = recorte([item({ valor: 4 }), item({ valor: 4 })])
    const comNaoSei = recorte([
      item({ valor: 4 }),
      item({ valor: 4 }),
      item({ naoSei: true, valor: null }),
    ])

    expect(comNaoSei.maturidade).toBe(semNaoSei.maturidade)
    expect(comNaoSei.visibilidade!).toBeLessThan(semNaoSei.visibilidade!)
  })

  it('é diferente de responder 1', () => {
    // O erro que destrói o diagnóstico: tratar ausência de visibilidade como
    // maturidade baixa.
    const naoSei = recorte([item({ valor: 5 }), item({ naoSei: true, valor: null })])
    const notaMinima = recorte([item({ valor: 5 }), item({ valor: 1 })])

    expect(naoSei.maturidade).toBe(100)
    expect(notaMinima.maturidade).toBe(50)
  })
})

// ---------------------------------------------------------------------------
// Maturidade ponderada
// ---------------------------------------------------------------------------

describe('maturidade', () => {
  it('pondera pelo peso', () => {
    // FIN.03 (DRE mensal) pesa 2.0 e puxa a dimensão mais que um item comum.
    const r = recorte([
      item({ codigo: 'FIN.03', valor: 1, peso: 2 }),
      item({ codigo: 'D1.01', valor: 5, peso: 1 }),
    ])

    // (0×2 + 100×1) / 3
    expect(r.maturidade).toBeCloseTo(33.33, 1)
  })

  it('ignora item com peso zero', () => {
    // Pergunta aberta e escala 0–10 têm peso 0 no seed: não pontuam maturidade.
    const r = recorte([item({ valor: 5 }), item({ codigo: 'D6.05', valor: 1, peso: 0 })])

    expect(r.maturidade).toBe(100)
  })

  it('não divide por zero quando todo peso é zero', () => {
    const r = recorte([item({ valor: 3, peso: 0 })])

    expect(r.maturidade).toBeNull()
  })

  it('devolve maturidade nula quando não há nenhum item aplicável', () => {
    const r = recorte([])

    expect(r.maturidade).toBeNull()
    expect(r.visibilidade).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Visibilidade
// ---------------------------------------------------------------------------

describe('visibilidade', () => {
  it('é a fração de itens respondidos com valor', () => {
    const r = recorte([
      item({ valor: 4 }),
      item({ valor: 4 }),
      item({ naoSei: true, valor: null }),
      item({ valor: null }),
    ])

    expect(r.visibilidade).toBe(50)
  })

  it('conta só os itens que pontuam', () => {
    // Aberta em branco é normal e não pode derrubar a visibilidade da dimensão.
    const r = recorte([item({ valor: 4 }), item({ codigo: 'A.01', valor: null, peso: 0 })])

    expect(r.visibilidade).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// Regra dura 2 — visibilidade baixa não emite nota
// ---------------------------------------------------------------------------

describe('visibilidade abaixo do limiar', () => {
  it(`marca confiavel = false abaixo de ${LIMIAR_VISIBILIDADE}%`, () => {
    // 1 de 3 respondidos = 33%.
    const r = recorte([
      item({ valor: 5 }),
      item({ naoSei: true, valor: null }),
      item({ naoSei: true, valor: null }),
    ])

    expect(r.visibilidade).toBeCloseTo(33.33, 1)
    expect(r.confiavel).toBe(false)
  })

  it('NÃO emite maturidade quando não é confiável', () => {
    // Em tela alguma nem no PDF: se o número não existe, ninguém o publica.
    const r = recorte([
      item({ valor: 5 }),
      item({ naoSei: true, valor: null }),
      item({ naoSei: true, valor: null }),
    ])

    expect(r.maturidade).toBeNull()
    expect(r.dispersao).toBeNull()
  })

  it('emite normalmente exatamente no limiar', () => {
    // 2 de 5 = 40%: o limiar é "abaixo de 40", não "até 40".
    const r = recorte([
      item({ valor: 5 }),
      item({ valor: 5 }),
      item({ naoSei: true, valor: null }),
      item({ naoSei: true, valor: null }),
      item({ naoSei: true, valor: null }),
    ])

    expect(r.visibilidade).toBe(40)
    expect(r.confiavel).toBe(true)
    expect(r.maturidade).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// Regra dura 3 — sigilo por amostra pequena
// ---------------------------------------------------------------------------

describe('supressão por amostra', () => {
  it(`suprime recorte com menos de ${MINIMO_RECORTE} respondentes`, () => {
    const r = calcularRecorte([item({ valor: 5 })], 2)

    expect(r.suprimido).toBe(true)
    expect(r.maturidade).toBeNull()
    expect(r.visibilidade).toBeNull()
    expect(r.dispersao).toBeNull()
  })

  it('não suprime com exatamente o mínimo', () => {
    const r = calcularRecorte([item({ valor: 5 })], MINIMO_RECORTE)

    expect(r.suprimido).toBe(false)
    expect(r.maturidade).toBe(100)
  })

  it('não vaza nem a visibilidade de um recorte suprimido', () => {
    // A supressão é promessa de sigilo feita ao respondente. Vazar "1 pessoa da
    // sua área respondeu, e a visibilidade dela é 20%" quebra a promessa.
    const r = calcularRecorte([item({ valor: 5 }), item({ naoSei: true, valor: null })], 1)

    expect(r.visibilidade).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Dispersão
// ---------------------------------------------------------------------------

describe('dispersão', () => {
  it('é zero quando todo mundo respondeu igual', () => {
    const r = recorte([item({ valor: 4 }), item({ valor: 4 }), item({ valor: 4 })])

    expect(r.dispersao).toBe(0)
  })

  it('cresce com a discordância', () => {
    const concorda = recorte([item({ valor: 3 }), item({ valor: 3 })])
    const discorda = recorte([item({ valor: 1 }), item({ valor: 5 })])

    expect(discorda.dispersao!).toBeGreaterThan(concorda.dispersao!)
  })

  it('é nula com um único score, onde dispersão não significa nada', () => {
    const r = recorte([item({ valor: 4 })])

    expect(r.dispersao).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Gap hierárquico
// ---------------------------------------------------------------------------

describe('gap hierárquico', () => {
  it('mede quanto a liderança enxerga melhor que a equipe', () => {
    const gap = calcularGapHierarquico({
      socio: [100],
      gestor: [80],
      colaborador: [40],
    })

    // média(100, 80) − 40
    expect(gap).toBe(50)
  })

  it('fica negativo quando a equipe avalia melhor que a liderança', () => {
    const gap = calcularGapHierarquico({ socio: [40], gestor: [], colaborador: [80] })

    expect(gap).toBe(-40)
  })

  it('não quebra e devolve nulo sem colaborador nenhum', () => {
    const gap = calcularGapHierarquico({ socio: [80], gestor: [70], colaborador: [] })

    expect(gap).toBeNull()
  })

  it('devolve nulo sem liderança nenhuma', () => {
    const gap = calcularGapHierarquico({ socio: [], gestor: [], colaborador: [50] })

    expect(gap).toBeNull()
  })

  it('junta sócio e gestor num lado só', () => {
    const gap = calcularGapHierarquico({ socio: [90], gestor: [70], colaborador: [50] })

    expect(gap).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// eNPS
// ---------------------------------------------------------------------------

describe('eNPS', () => {
  it('é a diferença entre promotores e detratores', () => {
    // 2 promotores (9,10) e 1 detrator (3) em 5 → 40% − 20% = 20.
    expect(calcularEnps([9, 10, 7, 8, 3])).toBe(20)
  })

  it('trata 7 e 8 como neutros', () => {
    expect(calcularEnps([7, 8, 7, 8, 7])).toBe(0)
  })

  it('chega a -100 com todo mundo detrator', () => {
    expect(calcularEnps([0, 1, 2, 5, 6])).toBe(-100)
  })

  it(`suprime com menos de ${MINIMO_ENPS} respostas`, () => {
    expect(calcularEnps([10, 10, 10, 10])).toBeNull()
  })

  it('não suprime com exatamente o mínimo', () => {
    expect(calcularEnps([10, 10, 10, 10, 10])).toBe(100)
  })

  it('ignora nota fora da escala em vez de distorcer a conta', () => {
    expect(calcularEnps([9, 10, 7, 8, 3, 42, -1])).toBe(20)
  })
})
