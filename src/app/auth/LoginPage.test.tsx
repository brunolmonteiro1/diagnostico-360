import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderRotas } from '@/test/render-rotas'

describe('LoginPage', () => {
  it('entra com as credenciais informadas', async () => {
    const usuario = userEvent.setup()
    const entrar = vi.fn().mockResolvedValue(undefined)
    renderRotas({ rota: '/login', entrar })

    await usuario.type(screen.getByLabelText('E-mail'), 'consultor@teste.dev')
    await usuario.type(screen.getByLabelText('Senha'), 'segredo123')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() =>
      expect(entrar).toHaveBeenCalledWith('consultor@teste.dev', 'segredo123')
    )
  })

  it('não envia e-mail inválido', async () => {
    const usuario = userEvent.setup()
    const entrar = vi.fn()
    renderRotas({ rota: '/login', entrar })

    await usuario.type(screen.getByLabelText('E-mail'), 'nao-e-email')
    await usuario.type(screen.getByLabelText('Senha'), 'segredo123')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe um e-mail válido'
    )
    expect(entrar).not.toHaveBeenCalled()
  })

  it('não revela se o e-mail existe quando a autenticação falha', async () => {
    const usuario = userEvent.setup()
    const entrar = vi.fn().mockRejectedValue(new Error('Invalid login credentials'))
    renderRotas({ rota: '/login', entrar })

    await usuario.type(screen.getByLabelText('E-mail'), 'consultor@teste.dev')
    await usuario.type(screen.getByLabelText('Senha'), 'errada')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent('E-mail ou senha incorretos.')
    // A mensagem do provedor não pode vazar para a tela: ela distingue
    // "usuário não existe" de "senha errada".
    expect(aviso).not.toHaveTextContent('Invalid login credentials')
  })
})
