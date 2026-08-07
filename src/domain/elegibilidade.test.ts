import { describe, expect, it } from 'vitest'
import {
  calcularProgresso,
  ehAplicavel,
  perguntasAplicaveis,
  type Perfil,
  type PerguntaElegivel,
} from './elegibilidade'

const p = (over: Partial<PerguntaElegivel>): PerguntaElegivel => ({
  codigo: 'D1.01',
  bloco: 'universal',
  areaScope: [],
  vinculoScope: [],
  ordem: 1,
  ...over,
})

const perfil = (over: Partial<Perfil> = {}): Perfil => ({
  areaPrincipal: 'financeiro',
  vinculo: 'colaborador',
  ...over,
})

const TODOS_MODULOS = [
  'comercial',
  'marketing',
  'operacional',
  'atendimento',
  'financeiro',
  'admrh',
  'ti',
  'juridico',
  'franqueadora',
]

const aplicavel = (
  pergunta: PerguntaElegivel,
  perfilAtual: Perfil,
  respostas = {},
  modulos = TODOS_MODULOS
) => ehAplicavel(pergunta, perfilAtual, respostas, modulos)

// ---------------------------------------------------------------------------
// Blocos que valem para todo mundo
// ---------------------------------------------------------------------------

describe('blocos universais', () => {
  it('identificação e encerramento valem para qualquer perfil', () => {
    // Inclusive antes de a pessoa dizer quem é: sem identificação não há perfil.
    const semPerfil = perfil({ areaPrincipal: null, vinculo: null })

    expect(aplicavel(p({ bloco: 'identificacao' }), semPerfil)).toBe(true)
    expect(aplicavel(p({ bloco: 'encerramento' }), semPerfil)).toBe(true)
  })

  it('escopo de área vazio aparece para todas as áreas', () => {
    expect(aplicavel(p({ areaScope: [] }), perfil({ areaPrincipal: 'ti' }))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Bloco de área — vem de ID.04
// ---------------------------------------------------------------------------

describe('bloco de área', () => {
  it('aparece para quem escolheu aquela área', () => {
    expect(
      aplicavel(
        p({ codigo: 'FIN.01', bloco: 'area', areaScope: ['financeiro'] }),
        perfil({ areaPrincipal: 'financeiro' })
      )
    ).toBe(true)
  })

  it('não aparece para quem escolheu outra área', () => {
    expect(
      aplicavel(
        p({ codigo: 'FIN.01', bloco: 'area', areaScope: ['financeiro'] }),
        perfil({ areaPrincipal: 'comercial' })
      )
    ).toBe(false)
  })

  it('não aparece antes de a área ser declarada', () => {
    expect(
      aplicavel(
        p({ codigo: 'FIN.01', bloco: 'area', areaScope: ['financeiro'] }),
        perfil({ areaPrincipal: null })
      )
    ).toBe(false)
  })

  it('diretoria e outra não têm bloco de área próprio', () => {
    // Intencional, não lacuna: quem escolhe uma delas responde universal +
    // liderança (se o vínculo permitir) + encerramento.
    for (const area of ['diretoria', 'outra']) {
      const temAlgumBlocoDeArea = TODOS_MODULOS.some((modulo) =>
        aplicavel(
          p({ bloco: 'area', areaScope: [modulo] }),
          perfil({ areaPrincipal: area })
        )
      )

      expect(temAlgumBlocoDeArea).toBe(false)
    }
  })

  it('respeita os módulos ativos da rodada', () => {
    // Franqueadora é módulo opcional: não habilitar em cliente que não é franquia.
    expect(
      ehAplicavel(
        p({ codigo: 'FRA.01', bloco: 'area', areaScope: ['franqueadora'] }),
        perfil({ areaPrincipal: 'franqueadora' }),
        {},
        ['financeiro', 'comercial']
      )
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Bloco de liderança — vem de ID.06
// ---------------------------------------------------------------------------

describe('bloco de liderança', () => {
  it('não aparece para colaborador', () => {
    expect(
      aplicavel(p({ codigo: 'LID.01', bloco: 'lideranca' }), perfil({ vinculo: 'colaborador' }))
    ).toBe(false)
  })

  it('aparece para sócio e para gestor', () => {
    for (const vinculo of ['socio', 'gestor']) {
      expect(
        aplicavel(p({ codigo: 'LID.01', bloco: 'lideranca' }), perfil({ vinculo }))
      ).toBe(true)
    }
  })

  it('não aparece para terceirizado, estagiário nem franqueadora', () => {
    for (const vinculo of ['terceirizado', 'estagiario', 'franqueadora']) {
      expect(
        aplicavel(p({ codigo: 'LID.01', bloco: 'lideranca' }), perfil({ vinculo }))
      ).toBe(false)
    }
  })

  it('respeita o escopo de vínculo mais estreito dentro do bloco', () => {
    // LID.07 (pró-labore) é só para sócio, mesmo dentro do bloco de liderança.
    const soSocio = p({ codigo: 'LID.07', bloco: 'lideranca', vinculoScope: ['socio'] })

    expect(aplicavel(soSocio, perfil({ vinculo: 'socio' }))).toBe(true)
    expect(aplicavel(soSocio, perfil({ vinculo: 'gestor' }))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Follow-ups condicionais
// ---------------------------------------------------------------------------

describe('follow-ups condicionais', () => {
  it('D4.03 só aparece depois de D4.02 ser positiva', () => {
    const seguimento = p({ codigo: 'D4.03' })
    const eu = perfil()

    expect(aplicavel(seguimento, eu, {})).toBe(false)
    expect(aplicavel(seguimento, eu, { 'D4.02': { valor: 3, naoSei: false } })).toBe(false)
    expect(aplicavel(seguimento, eu, { 'D4.02': { valor: 4, naoSei: false } })).toBe(true)
    expect(aplicavel(seguimento, eu, { 'D4.02': { valor: 5, naoSei: false } })).toBe(true)
  })

  it('não aparece quando a anterior foi "não sei"', () => {
    // Quem não sabe se existe meta não tem meta para escrever.
    expect(
      aplicavel(p({ codigo: 'D4.03' }), perfil(), {
        'D4.02': { valor: null, naoSei: true },
      })
    ).toBe(false)
  })

  it('vale igual para COM.04 e FIN.04', () => {
    expect(
      aplicavel(p({ codigo: 'COM.04' }), perfil(), { 'COM.03': { valor: 5, naoSei: false } })
    ).toBe(true)
    expect(
      aplicavel(p({ codigo: 'FIN.04' }), perfil(), { 'FIN.03': { valor: 2, naoSei: false } })
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Lista aplicável e progresso
// ---------------------------------------------------------------------------

describe('perguntasAplicaveis', () => {
  it('devolve na ordem e sem o que não se aplica', () => {
    const banco = [
      p({ codigo: 'ID.01', bloco: 'identificacao', ordem: 1 }),
      p({ codigo: 'D1.01', ordem: 101 }),
      p({ codigo: 'FIN.01', bloco: 'area', areaScope: ['financeiro'], ordem: 1501 }),
      p({ codigo: 'COM.01', bloco: 'area', areaScope: ['comercial'], ordem: 1101 }),
      p({ codigo: 'LID.01', bloco: 'lideranca', ordem: 2101 }),
      p({ codigo: 'FIM.01', bloco: 'encerramento', ordem: 3001 }),
    ]

    const codigos = perguntasAplicaveis(
      banco,
      perfil({ areaPrincipal: 'financeiro', vinculo: 'colaborador' }),
      {},
      TODOS_MODULOS
    ).map((x) => x.codigo)

    expect(codigos).toEqual(['ID.01', 'D1.01', 'FIN.01', 'FIM.01'])
  })
})

describe('calcularProgresso', () => {
  const banco = [
    p({ codigo: 'D1.01', ordem: 1 }),
    p({ codigo: 'D1.02', ordem: 2 }),
    p({ codigo: 'LID.01', bloco: 'lideranca', ordem: 3 }),
  ]

  it('conta sobre as perguntas aplicáveis, nunca sobre o total', () => {
    // Um colaborador que não vê o bloco de liderança não pode terminar em 67%.
    const aplicaveis = perguntasAplicaveis(banco, perfil({ vinculo: 'colaborador' }), {}, [])
    const progresso = calcularProgresso(aplicaveis, {
      'D1.01': { valor: 4, naoSei: false },
      'D1.02': { valor: null, naoSei: true },
    })

    expect(progresso.total).toBe(2)
    expect(progresso.respondidas).toBe(2)
    expect(progresso.percentual).toBe(100)
  })

  it('conta "não sei" como respondida', () => {
    // "Não sei" é resposta, não pendência: cobrar a pessoa por ela contraria o
    // princípio do produto.
    const aplicaveis = perguntasAplicaveis(banco, perfil({ vinculo: 'colaborador' }), {}, [])
    const progresso = calcularProgresso(aplicaveis, {
      'D1.01': { valor: null, naoSei: true },
    })

    expect(progresso.respondidas).toBe(1)
    expect(progresso.percentual).toBe(50)
  })

  it('não passa de 100% quando um follow-up entra na lista', () => {
    const comSeguimento = [...banco, p({ codigo: 'D4.03', ordem: 4 })]
    const respostas = {
      'D1.01': { valor: 4, naoSei: false },
      'D1.02': { valor: 4, naoSei: false },
      'D4.02': { valor: 5, naoSei: false },
    }

    const aplicaveis = perguntasAplicaveis(
      comSeguimento,
      perfil({ vinculo: 'colaborador' }),
      respostas,
      []
    )
    const progresso = calcularProgresso(aplicaveis, respostas)

    expect(progresso.total).toBe(3)
    expect(progresso.percentual).toBeLessThanOrEqual(100)
  })

  it('não divide por zero sem pergunta aplicável', () => {
    expect(calcularProgresso([], {}).percentual).toBe(0)
  })
})
