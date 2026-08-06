import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRotas, sessaoFalsa } from './test/render-rotas'

describe('rota protegida /app', () => {
  it('manda para o login quem não tem sessão', () => {
    renderRotas({ rota: '/app' })

    expect(screen.getByRole('heading', { name: 'Diagnóstico 360' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Painel' })).not.toBeInTheDocument()
  })

  it('renderiza o painel para quem tem sessão', () => {
    renderRotas({ rota: '/app', sessao: sessaoFalsa })

    expect(screen.getByRole('heading', { name: 'Painel' })).toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
  })

  it('espera antes de decidir, em vez de piscar o login', () => {
    // Regressão: redirecionar durante o carregamento joga para o login quem já
    // está autenticado, toda vez que a página é recarregada.
    renderRotas({ rota: '/app', carregando: true })

    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
  })

  it('mostra o e-mail do consultor no layout', () => {
    renderRotas({ rota: '/app', sessao: sessaoFalsa })

    expect(screen.getByText('consultor@teste.dev')).toBeInTheDocument()
  })
})

describe('demais rotas', () => {
  it('leva a raiz para /app', () => {
    renderRotas({ rota: '/', sessao: sessaoFalsa })

    expect(screen.getByRole('heading', { name: 'Painel' })).toBeInTheDocument()
  })

  it('devolve quem já tem sessão do login para o painel', () => {
    renderRotas({ rota: '/login', sessao: sessaoFalsa })

    expect(screen.getByRole('heading', { name: 'Painel' })).toBeInTheDocument()
  })

  it('mostra página não encontrada em endereço inexistente', () => {
    renderRotas({ rota: '/nao-existe', sessao: sessaoFalsa })

    expect(
      screen.getByRole('heading', { name: 'Página não encontrada' })
    ).toBeInTheDocument()
  })
})
