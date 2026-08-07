import { describe, expect, it } from 'vitest'
import { montarPayloadRelatorio } from './relatorio'
import {
  SYSTEM_PROMPT_RELATORIO,
  construirMensagemUsuario,
  validarNarrativa,
} from './relatorio-prompt'

describe('construirMensagemUsuario — nunca carrega dado individual', () => {
  it('a mensagem enviada ao modelo não contém id, nome ou e-mail de respondente', () => {
    const payload = montarPayloadRelatorio(
      [
        {
          id: 'respondente-oculto-999',
          vinculo: 'colaborador',
          areaPrincipal: 'financeiro',
          itens: [
            {
              codigo: 'D1.01',
              dimensao: 'papeis',
              peso: 1,
              invertida: false,
              naoSei: false,
              valor: 4,
            },
          ],
        },
      ],
      ['papeis'],
      ['financeiro']
    )

    const mensagem = construirMensagemUsuario(payload)

    expect(mensagem).not.toContain('respondente-oculto-999')
    expect(mensagem).not.toMatch(/nome|email|e-mail/i)
  })
})

describe('SYSTEM_PROMPT_RELATORIO', () => {
  it('instrui a nunca inferir dado ausente e a escrever "dado insuficiente"', () => {
    expect(SYSTEM_PROMPT_RELATORIO).toMatch(/dado insuficiente/)
  })

  it('proíbe explicitamente nome próprio e resposta individual', () => {
    expect(SYSTEM_PROMPT_RELATORIO.toLowerCase()).toContain('nome próprio')
  })
})

describe('validarNarrativa', () => {
  const exemploValido = {
    sumario_executivo: ['Cobertura ainda baixa nesta rodada de teste.'],
    diagnostico_por_dimensao: [{ dimensao: 'papeis', texto: 'dado insuficiente' }],
    achados_por_area: [{ area: 'financeiro', texto: 'dado insuficiente' }],
    gargalos: [],
    riscos_criticos: [],
    o_que_funciona: [],
    iniciativas: [],
    lacunas_do_diagnostico: ['Amostra da área financeiro abaixo do mínimo de sigilo.'],
  }

  it('aceita uma saída bem formada', () => {
    expect(validarNarrativa(exemploValido)).not.toBeNull()
  })

  it('rejeita saída com campo a mais (ex.: a IA alucinou um campo "nome")', () => {
    const comCampoExtra = { ...exemploValido, nome: 'vazamento' }
    expect(validarNarrativa(comCampoExtra)).toBeNull()
  })

  it('rejeita quando falta uma chave obrigatória', () => {
    const { riscos_criticos: _omitido, ...semRiscos } = exemploValido
    expect(validarNarrativa(semRiscos)).toBeNull()
  })

  it('rejeita quando um bloco de dimensão tem tipo errado', () => {
    const comTipoErrado = {
      ...exemploValido,
      diagnostico_por_dimensao: [{ dimensao: 'papeis', texto: 123 }],
    }
    expect(validarNarrativa(comTipoErrado)).toBeNull()
  })

  it('rejeita entrada que não é objeto', () => {
    expect(validarNarrativa(null)).toBeNull()
    expect(validarNarrativa('string qualquer')).toBeNull()
    expect(validarNarrativa([])).toBeNull()
  })
})
