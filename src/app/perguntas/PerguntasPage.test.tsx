import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderRotas, sessaoFalsa } from '@/test/render-rotas'
import type { Pergunta } from '@/lib/api'

vi.mock('@/lib/api', () => ({ listarPerguntas: vi.fn() }))

const { listarPerguntas } = await import('@/lib/api')

const pergunta = (p: Partial<Pergunta>): Pergunta =>
  ({
    id: p.codigo,
    codigo: 'X.01',
    bloco: 'universal',
    dimensao: 'papeis',
    area_scope: [],
    vinculo_scope: [],
    ordem: 1,
    enunciado: 'Enunciado',
    ajuda: null,
    tipo: 'likert5',
    opcoes: null,
    permite_nao_sei: true,
    invertida: false,
    peso: 1,
    obrigatoria: true,
    ativa: true,
    ...p,
  }) as Pergunta

describe('PerguntasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listarPerguntas).mockResolvedValue([
      pergunta({ codigo: 'D1.05', enunciado: 'Executo tarefas de outra pessoa', invertida: true }),
      pergunta({ codigo: 'FIN.03', bloco: 'area', dimensao: 'processos', area_scope: ['financeiro'], enunciado: 'Existe DRE mensal', peso: 2 }),
    ])
  })

  it('mostra o total e quantas são invertidas', async () => {
    renderRotas({ rota: '/app/perguntas', sessao: sessaoFalsa })

    expect(await screen.findByText(/2 perguntas, 1 invertidas/)).toBeInTheDocument()
  })

  it('marca a invertida e o peso alto', async () => {
    renderRotas({ rota: '/app/perguntas', sessao: sessaoFalsa })

    expect(await screen.findByText('invertida')).toBeInTheDocument()
    expect(screen.getByText('peso 2')).toBeInTheDocument()
  })

  it('agrupa por área dentro do bloco de área', async () => {
    renderRotas({ rota: '/app/perguntas', sessao: sessaoFalsa })

    // Dentro de "por área" o agrupamento útil é a área, não a dimensão: é assim
    // que o consultor decide quais módulos a rodada ativa.
    expect(await screen.findByText(/financeiro · 1/)).toBeInTheDocument()
    expect(screen.getByText(/papeis · 1/)).toBeInTheDocument()
  })

  it('filtra por código', async () => {
    const usuario = userEvent.setup()
    renderRotas({ rota: '/app/perguntas', sessao: sessaoFalsa })

    await usuario.type(await screen.findByLabelText('Buscar'), 'FIN')

    expect(screen.getByText('Existe DRE mensal')).toBeInTheDocument()
    expect(
      screen.queryByText('Executo tarefas de outra pessoa')
    ).not.toBeInTheDocument()
  })

  it('avisa que a tela é somente leitura', async () => {
    // O catálogo é compartilhado: editar aqui mudaria a rodada de outro consultor.
    renderRotas({ rota: '/app/perguntas', sessao: sessaoFalsa })

    expect(await screen.findByText(/somente leitura/)).toBeInTheDocument()
  })
})
