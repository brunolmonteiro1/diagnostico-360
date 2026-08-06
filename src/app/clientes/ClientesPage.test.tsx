import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderRotas, sessaoFalsa } from '@/test/render-rotas'
import type { Cliente } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  listarClientes: vi.fn(),
  criarCliente: vi.fn(),
}))

const { listarClientes, criarCliente } = await import('@/lib/api')

const cliente = (nome: string): Cliente =>
  ({
    id: `id-${nome}`,
    nome_fantasia: nome,
    segmento: 'Indústria',
    n_colaboradores: 40,
  }) as Cliente

describe('ClientesPage', () => {
  beforeEach(() => {
    // Sem isto o histórico de chamadas atravessa os testes e um `not.toHaveBeenCalled`
    // passa a enxergar a chamada do teste anterior.
    vi.clearAllMocks()
    vi.mocked(listarClientes).mockResolvedValue([cliente('Metalúrgica Aurora')])
    vi.mocked(criarCliente).mockResolvedValue(cliente('Novo'))
  })

  it('lista os clientes do consultor', async () => {
    renderRotas({ rota: '/app/clientes', sessao: sessaoFalsa })

    expect(await screen.findByText('Metalúrgica Aurora')).toBeInTheDocument()
  })

  it('avisa quando não há cliente nenhum', async () => {
    vi.mocked(listarClientes).mockResolvedValue([])
    renderRotas({ rota: '/app/clientes', sessao: sessaoFalsa })

    expect(
      await screen.findByText('Nenhum cliente cadastrado ainda.')
    ).toBeInTheDocument()
  })

  it('mostra o erro em vez de uma lista vazia enganosa', async () => {
    // Lista vazia por falha de rede leria como "você não tem clientes".
    vi.mocked(listarClientes).mockRejectedValue(
      new Error('Não foi possível carregar os clientes: falha de rede')
    )
    renderRotas({ rota: '/app/clientes', sessao: sessaoFalsa })

    expect(await screen.findByRole('alert')).toHaveTextContent('falha de rede')
  })

  it('cria um cliente com o dono explícito', async () => {
    const usuario = userEvent.setup()
    renderRotas({ rota: '/app/clientes', sessao: sessaoFalsa })

    await usuario.click(await screen.findByRole('button', { name: 'Novo cliente' }))
    await usuario.type(screen.getByLabelText('Nome do cliente'), 'Padaria Central')
    await usuario.click(screen.getByRole('button', { name: 'Salvar cliente' }))

    await waitFor(() => {
      // owner_id explícito: a policy exige `with check (owner_id = auth.uid())`.
      expect(criarCliente).toHaveBeenCalledWith(
        expect.objectContaining({ nome_fantasia: 'Padaria Central' }),
        'u1'
      )
    })
  })

  it('não envia cliente sem nome', async () => {
    const usuario = userEvent.setup()
    renderRotas({ rota: '/app/clientes', sessao: sessaoFalsa })

    await usuario.click(await screen.findByRole('button', { name: 'Novo cliente' }))
    await usuario.click(screen.getByRole('button', { name: 'Salvar cliente' }))

    expect(await screen.findByText('Informe o nome do cliente')).toBeInTheDocument()
    expect(criarCliente).not.toHaveBeenCalled()
  })
})
