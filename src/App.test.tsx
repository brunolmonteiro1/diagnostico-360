import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

/**
 * Teste trivial de fumaça: valida o setup (Vitest + Testing Library + jsdom
 * + alias). Os testes que importam — os do motor de cálculo — entram na Fase 5.
 */
describe('setup de testes', () => {
  it('renderiza a casca da aplicação', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Diagnóstico 360' })
    ).toBeInTheDocument()
  })
})
