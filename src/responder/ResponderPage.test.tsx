import { screen, within } from '@testing-library/react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Inicio, PerguntaServidor } from './api'

vi.mock('./api', async () => {
  const real = await vi.importActual<typeof import('./api')>('./api')
  return {
    ...real,
    iniciar: vi.fn(),
    salvarResposta: vi.fn(),
    salvarPerfil: vi.fn(),
    concluir: vi.fn(),
  }
})

const { iniciar, salvarResposta, salvarPerfil, concluir } = await import('./api')
const { ResponderPage } = await import('./ResponderPage')

const pergunta = (over: Partial<PerguntaServidor>): PerguntaServidor => ({
  // O id deriva do código já resolvido: usar `over.codigo` aqui geraria
  // "id-undefined" sempre que o teste aceitasse o código padrão.
  id: `id-${over.codigo ?? 'D1.01'}`,
  codigo: 'D1.01',
  bloco: 'universal',
  dimensao: 'papeis',
  area_scope: [],
  vinculo_scope: [],
  ordem: 101,
  enunciado: 'Sei quais são as minhas responsabilidades',
  ajuda: null,
  tipo: 'likert5',
  opcoes: null,
  permite_nao_sei: true,
  permite_nao_existe: false,
  obrigatoria: true,
  ...over,
})

const inicio = (perguntas: PerguntaServidor[]): Inicio => ({
  ok: true,
  rodada: {
    id: 'r1',
    titulo: 'Diagnóstico 2026',
    anonima: false,
    modulosAtivos: ['financeiro'],
    prazoEm: null,
    mensagemAbertura: null,
  },
  empresa: 'Metalúrgica Aurora',
  respondente: {
    id: 'p1',
    nome: null,
    email: null,
    cargo: null,
    areaPrincipal: null,
    areasSecundarias: [],
    vinculo: null,
    tempoEmpresa: null,
    reportaPara: null,
    nLiderados: null,
    consentimentoLgpd: false,
    status: 'em_andamento',
  },
  perguntas,
  respostas: [],
})

function montar(token = 'abc123') {
  return render(
    <MemoryRouter initialEntries={[`/responder/${token}`]}>
      <Routes>
        <Route path="/responder/:token" element={<ResponderPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ResponderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Todos os mocks precisam resolver: um vi.fn() sem retorno devolve
    // undefined, e foi assim que um `resultado.ok` passou despercebido.
    vi.mocked(salvarResposta).mockResolvedValue({ ok: true })
    vi.mocked(salvarPerfil).mockResolvedValue({ ok: true })
    vi.mocked(concluir).mockResolvedValue({ ok: true, jaConcluido: false })
  })

  it('usa o texto de abertura obrigatório, literalmente', async () => {
    vi.mocked(iniciar).mockResolvedValue(inicio([pergunta({})]))
    montar()

    expect(
      await screen.findByRole('heading', {
        name: 'Diagnóstico 360 — Metalúrgica Aurora',
      })
    ).toBeInTheDocument()

    // As três promessas da abertura são o contrato do produto com quem responde.
    expect(
      screen.getByText(/Saber que uma informação não está disponível para você é tão útil/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Suas respostas individuais não serão mostradas para a empresa/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/O que atrapalha o trabalho aqui é resposta bonita, não resposta ruim/)
    ).toBeInTheDocument()
  })

  it('mostra tela amigável, e não erro, para token inválido', async () => {
    vi.mocked(iniciar).mockResolvedValue({ ok: false, motivo: 'token_invalido' })
    montar('lixo')

    expect(
      await screen.findByRole('heading', { name: 'Link não reconhecido' })
    ).toBeInTheDocument()
  })

  it('explica que a rodada encerrou, em vez de falhar', async () => {
    vi.mocked(iniciar).mockResolvedValue({ ok: false, motivo: 'rodada_encerrada' })
    montar()

    expect(
      await screen.findByRole('heading', { name: 'Questionário encerrado' })
    ).toBeInTheDocument()
  })

  it('oferece "Não sei" fora da escala, em toda pergunta objetiva', async () => {
    const usuario = userEvent.setup()
    vi.mocked(iniciar).mockResolvedValue(inicio([pergunta({})]))
    montar()

    await usuario.click(await screen.findByRole('button', { name: 'Começar' }))

    const naoSei = await screen.findByRole('button', {
      name: /Não sei \/ Não tenho visibilidade sobre isso/,
    })
    expect(naoSei).toBeInTheDocument()

    // Ela não pode ser um dos valores da escala: os botões numerados são 5.
    const cartao = naoSei.closest('fieldset')!
    const numerados = within(cartao)
      .getAllByRole('button')
      .filter((b) => /^[1-5]/.test(b.textContent ?? ''))
    expect(numerados).toHaveLength(5)
  })

  it('marcar "Não sei" grava nao_sei e limpa os valores', async () => {
    const usuario = userEvent.setup()
    vi.mocked(iniciar).mockResolvedValue(inicio([pergunta({})]))
    montar()

    await usuario.click(await screen.findByRole('button', { name: 'Começar' }))
    await usuario.click(
      await screen.findByRole('button', {
        name: /Não sei \/ Não tenho visibilidade sobre isso/,
      })
    )

    expect(salvarResposta).toHaveBeenCalledWith('abc123', {
      pergunta_id: 'id-D1.01',
      nao_sei: true,
      nao_existe: false,
      valor_num: null,
      valor_texto: null,
      valor_opcoes: null,
    })
  })

  it('salva a cada resposta, sem botão de salvar', async () => {
    const usuario = userEvent.setup()
    vi.mocked(iniciar).mockResolvedValue(inicio([pergunta({})]))
    montar()

    await usuario.click(await screen.findByRole('button', { name: 'Começar' }))
    await usuario.click(await screen.findByRole('button', { name: /^4/ }))

    expect(salvarResposta).toHaveBeenCalledWith(
      'abc123',
      expect.objectContaining({ valor_num: 4, nao_sei: false })
    )
  })

  it('não mostra o bloco de liderança para colaborador', async () => {
    const usuario = userEvent.setup()
    vi.mocked(iniciar).mockResolvedValue(
      inicio([
        pergunta({ codigo: 'ID.06', bloco: 'identificacao', dimensao: null, tipo: 'unica', ordem: 6,
          enunciado: 'Qual é o seu vínculo?',
          opcoes: [
            { valor: 'colaborador', rotulo: 'Colaborador' },
            { valor: 'socio', rotulo: 'Sócio' },
          ] }),
        pergunta({ codigo: 'D1.01' }),
        pergunta({ codigo: 'LID.01', bloco: 'lideranca', dimensao: null, ordem: 2101,
          enunciado: 'Existe plano escrito para 12 meses' }),
      ])
    )
    montar()

    await usuario.click(await screen.findByRole('button', { name: 'Começar' }))
    await usuario.click(await screen.findByRole('button', { name: 'Colaborador' }))

    // Avança até o fim e confirma que a pergunta de liderança nunca aparece.
    for (let i = 0; i < 4; i++) {
      const continuar = screen.queryByRole('button', { name: 'Continuar' })
      if (!continuar) break
      await usuario.click(continuar)
    }

    expect(
      screen.queryByText('Existe plano escrito para 12 meses')
    ).not.toBeInTheDocument()
  })
})
