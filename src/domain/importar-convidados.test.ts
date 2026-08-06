import { describe, expect, it } from 'vitest'
import {
  descartarJaConvidados,
  importarConvidados,
  linkDoConvite,
} from './importar-convidados'

describe('importarConvidados', () => {
  it('lê e-mails colados um por linha', () => {
    const r = importarConvidados('ana@empresa.com\nbruno@empresa.com')

    expect(r.convidados).toEqual([
      { email: 'ana@empresa.com', nome: null },
      { email: 'bruno@empresa.com', nome: null },
    ])
    expect(r.ignorados).toEqual([])
  })

  it('ignora linhas em branco sem tratá-las como erro', () => {
    const r = importarConvidados('\nana@empresa.com\n\n\nbruno@empresa.com\n')

    expect(r.convidados).toHaveLength(2)
    expect(r.ignorados).toEqual([])
  })

  it('normaliza caixa e espaços', () => {
    const r = importarConvidados('  ANA@Empresa.COM  ')

    expect(r.convidados[0].email).toBe('ana@empresa.com')
  })

  it('lê CSV com nome e e-mail', () => {
    const r = importarConvidados(
      'nome,email\nAna Souza,ana@empresa.com\nBruno Lima,bruno@empresa.com'
    )

    expect(r.convidados).toEqual([
      { email: 'ana@empresa.com', nome: 'Ana Souza' },
      { email: 'bruno@empresa.com', nome: 'Bruno Lima' },
    ])
  })

  it('lê CSV com as colunas na ordem inversa', () => {
    const r = importarConvidados('email;nome\nana@empresa.com;Ana Souza')

    expect(r.convidados).toEqual([{ email: 'ana@empresa.com', nome: 'Ana Souza' }])
  })

  it('lê o formato "Nome <email>" que o cliente de e-mail produz', () => {
    const r = importarConvidados('Ana Souza <ana@empresa.com>')

    expect(r.convidados).toEqual([{ email: 'ana@empresa.com', nome: 'Ana Souza' }])
  })

  it('descarta o cabeçalho só na primeira linha', () => {
    const r = importarConvidados('nome,email\nAna,ana@empresa.com')

    expect(r.convidados).toHaveLength(1)
    expect(r.ignorados).toEqual([])
  })

  it('reporta a linha que não tem e-mail, em vez de sumir com ela', () => {
    const r = importarConvidados('ana@empresa.com\nBruno Lima\ncarla@empresa.com')

    expect(r.convidados).toHaveLength(2)
    expect(r.ignorados).toEqual([
      {
        linha: 2,
        conteudo: 'Bruno Lima',
        motivo: 'Não encontrei um e-mail nesta linha',
      },
    ])
  })

  it('remove repetido e diz de onde veio', () => {
    const r = importarConvidados(
      'ana@empresa.com\nbruno@empresa.com\nANA@empresa.com'
    )

    expect(r.convidados).toHaveLength(2)
    expect(r.ignorados[0]).toMatchObject({
      linha: 3,
      motivo: 'E-mail repetido (já apareceu na linha 1)',
    })
  })

  it('não gera convidado a partir de texto solto', () => {
    const r = importarConvidados('lista de participantes da reunião')

    expect(r.convidados).toEqual([])
    expect(r.ignorados).toHaveLength(1)
  })

  it('mantém nome vazio como null em vez de string vazia', () => {
    const r = importarConvidados(',ana@empresa.com')

    expect(r.convidados[0].nome).toBeNull()
  })
})

describe('descartarJaConvidados', () => {
  it('não gera link novo para quem já foi convidado', () => {
    // Reimportar a planilha depois de acrescentar gente é o caso normal.
    const importado = importarConvidados(
      'ana@empresa.com\nbruno@empresa.com\ncarla@empresa.com'
    )

    const r = descartarJaConvidados(importado, ['ANA@empresa.com'])

    expect(r.convidados.map((c) => c.email)).toEqual([
      'bruno@empresa.com',
      'carla@empresa.com',
    ])
    expect(r.ignorados).toContainEqual({
      linha: 0,
      conteudo: 'ana@empresa.com',
      motivo: 'Já tem convite nesta rodada',
    })
  })

  it('preserva os ignorados que já existiam', () => {
    const importado = importarConvidados('ana@empresa.com\nsem email aqui')

    const r = descartarJaConvidados(importado, [])

    expect(r.convidados).toHaveLength(1)
    expect(r.ignorados).toHaveLength(1)
  })
})

describe('linkDoConvite', () => {
  it('monta o link do respondente', () => {
    expect(linkDoConvite('https://d.ethoslab.com.br', 'abc123')).toBe(
      'https://d.ethoslab.com.br/responder/abc123'
    )
  })

  it('não duplica a barra final', () => {
    expect(linkDoConvite('https://d.ethoslab.com.br/', 'abc123')).toBe(
      'https://d.ethoslab.com.br/responder/abc123'
    )
  })
})
