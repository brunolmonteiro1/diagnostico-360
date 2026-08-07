import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { calcularProgresso, perguntasAplicaveis } from '@/domain/elegibilidade'
import { CampoPergunta, VAZIO, type ValorResposta } from './CampoPergunta'
import { etapaDeRetomada, montarEtapas } from './etapas'
import {
  MENSAGEM_RECUSA,
  concluir,
  iniciar,
  salvarPerfil,
  salvarResposta,
  type Inicio,
  type MotivoRecusa,
  type PerguntaServidor,
} from './api'

/**
 * As perguntas de identificação existem em `perguntas` para definir o
 * formulário (enunciado, opções, ordem), mas as RESPOSTAS delas moram em
 * `respondentes`, não em `respostas`. É de lá que sai o roteamento condicional
 * e a quebra por área e vínculo do cockpit — guardar nos dois lugares
 * significaria duas versões da mesma verdade.
 */
const CAMPO_DE_PERFIL: Readonly<Record<string, string>> = {
  'ID.01': 'nome',
  'ID.02': 'email',
  'ID.03': 'cargo',
  'ID.04': 'area_principal',
  'ID.05': 'areas_secundarias',
  'ID.06': 'vinculo',
  'ID.07': 'tempo_empresa',
  'ID.08': 'reporta_para',
  'ID.09': 'n_liderados',
  'ID.10': 'consentimento_lgpd',
}

type Estado =
  | { fase: 'carregando' }
  | { fase: 'recusado'; motivo: MotivoRecusa }
  | { fase: 'pronto'; dados: Inicio }

export function ResponderPage() {
  const { token = '' } = useParams()
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' })
  const [valores, setValores] = useState<Record<string, ValorResposta>>({})
  const [perfil, setPerfil] = useState<Record<string, unknown>>({})
  const [indice, setIndice] = useState(0)
  const [salvando, setSalvando] = useState(0)
  const [falhaAoSalvar, setFalhaAoSalvar] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const topo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ativo = true

    iniciar(token).then((r) => {
      if (!ativo) return

      if (!r.ok) {
        setEstado({ fase: 'recusado', motivo: r.motivo })
        return
      }

      const iniciais: Record<string, ValorResposta> = {}
      const porId = new Map(r.perguntas.map((p) => [p.id, p]))

      for (const resposta of r.respostas) {
        const pergunta = porId.get(resposta.pergunta_id)
        if (!pergunta) continue
        iniciais[pergunta.codigo] = {
          naoSei: resposta.nao_sei,
          valorNum: resposta.valor_num,
          valorTexto: resposta.valor_texto,
          valorOpcoes: resposta.valor_opcoes,
        }
      }

      setValores(iniciais)
      setPerfil({
        nome: r.respondente.nome,
        email: r.respondente.email,
        cargo: r.respondente.cargo,
        area_principal: r.respondente.areaPrincipal,
        areas_secundarias: r.respondente.areasSecundarias,
        vinculo: r.respondente.vinculo,
        tempo_empresa: r.respondente.tempoEmpresa,
        reporta_para: r.respondente.reportaPara,
        n_liderados: r.respondente.nLiderados,
        consentimento_lgpd: r.respondente.consentimentoLgpd,
      })
      setConcluido(r.respondente.status === 'concluido')
      setEstado({ fase: 'pronto', dados: r })
    })

    return () => {
      ativo = false
    }
  }, [token])

  const dados = estado.fase === 'pronto' ? estado.dados : null

  // Valores de perfil como se fossem respostas, para o roteamento condicional
  // enxergar ID.04 e ID.06 do mesmo jeito que enxerga D4.02.
  const respostasParaRoteamento = useMemo(() => {
    const mapa: Record<string, { valor: number | null; naoSei: boolean }> = {}
    for (const [codigo, v] of Object.entries(valores)) {
      mapa[codigo] = { valor: v.valorNum, naoSei: v.naoSei }
    }
    return mapa
  }, [valores])

  const aplicaveis = useMemo(() => {
    if (!dados) return []

    const paraDominio = dados.perguntas.map((p) => ({
      ...p,
      areaScope: p.area_scope,
      vinculoScope: p.vinculo_scope,
    }))

    return perguntasAplicaveis(
      paraDominio,
      {
        areaPrincipal: (perfil.area_principal as string | null) ?? null,
        vinculo: (perfil.vinculo as string | null) ?? null,
      },
      respostasParaRoteamento,
      dados.rodada.modulosAtivos
    )
  }, [dados, perfil, respostasParaRoteamento])

  const etapas = useMemo(() => montarEtapas(aplicaveis), [aplicaveis])

  const respondidas = useMemo(() => {
    const set = new Set<string>()

    for (const pergunta of aplicaveis) {
      const campo = CAMPO_DE_PERFIL[pergunta.codigo]

      if (campo) {
        const v = perfil[campo]
        const preenchido =
          v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
        if (preenchido) set.add(pergunta.codigo)
        continue
      }

      const valor = valores[pergunta.codigo]
      if (!valor) continue
      if (
        valor.naoSei ||
        valor.valorNum !== null ||
        (valor.valorTexto !== null && valor.valorTexto !== '') ||
        (valor.valorOpcoes !== null && valor.valorOpcoes.length > 0)
      ) {
        set.add(pergunta.codigo)
      }
    }

    return set
  }, [aplicaveis, valores, perfil])

  const progresso = useMemo(
    () =>
      calcularProgresso(
        aplicaveis,
        Object.fromEntries(
          aplicaveis.map((p) => [
            p.codigo,
            respondidas.has(p.codigo)
              ? { valor: 1, naoSei: false }
              : { valor: null, naoSei: false },
          ])
        )
      ),
    [aplicaveis, respondidas]
  )

  // Retoma no ponto exato, uma única vez, depois que as etapas existem.
  const retomou = useRef(false)
  useEffect(() => {
    if (retomou.current || etapas.length <= 1 || !dados) return
    retomou.current = true
    setIndice(concluido ? etapas.length - 1 : etapaDeRetomada(etapas, respondidas))
  }, [etapas, respondidas, dados, concluido])

  const gravar = useCallback(
    async (pergunta: PerguntaServidor, valor: ValorResposta) => {
      setSalvando((n) => n + 1)

      const campo = CAMPO_DE_PERFIL[pergunta.codigo]
      const resultado = campo
        ? await salvarPerfil(token, { [campo]: valorParaPerfil(campo, valor) })
        : await salvarResposta(token, {
            pergunta_id: pergunta.id,
            nao_sei: valor.naoSei,
            valor_num: valor.valorNum,
            valor_texto: valor.valorTexto,
            valor_opcoes: valor.valorOpcoes,
          })

      setSalvando((n) => n - 1)
      setFalhaAoSalvar(!resultado.ok)
    },
    [token]
  )

  const mudar = useCallback(
    (pergunta: PerguntaServidor, valor: ValorResposta) => {
      setValores((atuais) => ({ ...atuais, [pergunta.codigo]: valor }))

      const campo = CAMPO_DE_PERFIL[pergunta.codigo]
      if (campo) {
        setPerfil((atual) => ({ ...atual, [campo]: valorParaPerfil(campo, valor) }))
      }

      void gravar(pergunta, valor)
    },
    [gravar]
  )

  if (estado.fase === 'carregando') {
    return (
      <Moldura>
        <p role="status" className="text-sem-dado">
          Carregando…
        </p>
      </Moldura>
    )
  }

  if (estado.fase === 'recusado') {
    const mensagem = MENSAGEM_RECUSA[estado.motivo]
    return (
      <Moldura>
        <h1 className="text-2xl">{mensagem.titulo}</h1>
        <p className="text-sem-dado mt-4 max-w-md">{mensagem.texto}</p>
      </Moldura>
    )
  }

  const etapa = etapas[Math.min(indice, etapas.length - 1)]
  const primeira = indice === 0
  const ultimaDePerguntas = indice === etapas.length - 2

  function irPara(novo: number) {
    setIndice(novo)
    topo.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <Moldura>
      <div ref={topo} />

      {etapa.tipo !== 'abertura' && etapa.tipo !== 'conclusao' && (
        <div className="mb-8">
          <div className="bg-muted h-1 w-full">
            <div
              className="bg-accent h-full transition-all"
              style={{ width: `${progresso.percentual}%` }}
            />
          </div>
          <p className="text-sem-dado mt-2 text-sm">
            {progresso.respondidas} de {progresso.total} · {Math.round(progresso.percentual)}%
          </p>
        </div>
      )}

      {etapa.tipo === 'abertura' && (
        <TelaAbertura
          empresa={dados!.empresa}
          mensagem={dados!.rodada.mensagemAbertura}
          aoComecar={() => irPara(1)}
        />
      )}

      {etapa.tipo === 'conclusao' && (
        <div>
          <h1 className="text-2xl">Respostas enviadas</h1>
          <p className="mt-4 max-w-md">
            Obrigado pelo tempo. Suas respostas individuais não serão mostradas para a
            empresa — o relatório entregue à direção apresenta os dados de forma
            agregada.
          </p>
          <p className="text-sem-dado mt-4 max-w-md text-sm">
            Você pode fechar esta página.
          </p>
        </div>
      )}

      {etapa.tipo !== 'abertura' && etapa.tipo !== 'conclusao' && (
        <>
          <h1 className="text-2xl">{etapa.titulo}</h1>
          {etapa.subtitulo && (
            <p className="text-sem-dado mt-2 max-w-xl text-sm">{etapa.subtitulo}</p>
          )}

          <div className="mt-8 space-y-5">
            {etapa.perguntas.map((pergunta) => {
              const completa = dados!.perguntas.find((p) => p.codigo === pergunta.codigo)!
              return (
                <CampoPergunta
                  key={pergunta.codigo}
                  pergunta={completa}
                  valor={valores[pergunta.codigo] ?? VAZIO}
                  aoMudar={(novo) => mudar(completa, novo)}
                />
              )
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            {!primeira && (
              <Button type="button" variant="outline" onClick={() => irPara(indice - 1)}>
                Voltar
              </Button>
            )}

            {ultimaDePerguntas ? (
              <Button
                type="button"
                onClick={async () => {
                  const r = await concluir(token)
                  if (r.ok) {
                    setConcluido(true)
                    irPara(etapas.length - 1)
                  } else {
                    setFalhaAoSalvar(true)
                  }
                }}
              >
                Enviar respostas
              </Button>
            ) : (
              <Button type="button" onClick={() => irPara(indice + 1)}>
                Continuar
              </Button>
            )}

            <span className="text-sem-dado text-sm" aria-live="polite">
              {falhaAoSalvar
                ? 'Não conseguimos salvar. Verifique sua conexão.'
                : salvando > 0
                  ? 'Salvando…'
                  : 'Salvo automaticamente'}
            </span>
          </div>
        </>
      )}
    </Moldura>
  )
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="grade-blueprint min-h-screen px-5 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl">{children}</div>
    </main>
  )
}

/**
 * TEXTO OBRIGATÓRIO. Não reescrever: ele é a promessa de sigilo que a supressão
 * por amostra (n < 3) sustenta depois, e o convite explícito a responder
 * "não sei" em vez de chutar.
 */
function TelaAbertura({
  empresa,
  mensagem,
  aoComecar,
}: {
  empresa: string
  mensagem: string | null
  aoComecar: () => void
}) {
  return (
    <div>
      <div className="bg-accent mb-4 h-[3px] w-10" />
      <p className="text-sem-dado text-sm tracking-[0.2em] uppercase">Ethos Lab</p>
      <h1 className="mt-1 text-3xl">Diagnóstico 360 — {empresa}</h1>

      <div className="mt-8 space-y-5">
        <p>
          Este questionário foi solicitado pela direção da empresa e é conduzido por
          consultoria externa. O objetivo é entender como a empresa funciona hoje, na
          prática, na visão de quem faz o trabalho.
        </p>

        <p>Leva de 15 a 25 minutos. Você pode parar e voltar depois pelo mesmo link.</p>

        <p className="font-medium">Três coisas importantes:</p>

        <ol className="space-y-4">
          <li className="card-pergunta-ativo border-border border bg-white p-4">
            <span className="font-heading text-sem-dado mr-2">1</span>
            Se você não sabe, responda "Não sei". Todas as perguntas têm essa opção. Não
            tente adivinhar nem responder o que acha que esperam de você. Saber que uma
            informação não está disponível para você é tão útil quanto a informação em
            si.
          </li>
          <li className="card-pergunta-ativo border-border border bg-white p-4">
            <span className="font-heading text-sem-dado mr-2">2</span>
            Suas respostas individuais não serão mostradas para a empresa. O relatório
            entregue à direção apresenta os dados de forma agregada. A identificação
            serve para cruzarmos as respostas por área e por função — não para avaliar
            pessoas.
          </li>
          <li className="card-pergunta-ativo border-border border bg-white p-4">
            <span className="font-heading text-sem-dado mr-2">3</span>
            Não existe resposta certa. O que atrapalha o trabalho aqui é resposta
            bonita, não resposta ruim.
          </li>
        </ol>

        {mensagem && (
          <div className="border-border border-l-[3px] bg-white p-4">
            <p className="text-sem-dado mb-2 text-xs tracking-[0.15em] uppercase">
              Mensagem da direção
            </p>
            <p className="whitespace-pre-line">{mensagem}</p>
          </div>
        )}
      </div>

      <Button type="button" onClick={aoComecar} className="mt-10 h-12 w-full sm:w-auto">
        Começar
      </Button>
    </div>
  )
}

function valorParaPerfil(campo: string, valor: ValorResposta): unknown {
  if (campo === 'areas_secundarias') return valor.valorOpcoes ?? []
  if (campo === 'n_liderados') return valor.valorNum
  if (campo === 'consentimento_lgpd') return valor.valorTexto === 'sim'
  return valor.valorTexto ?? valor.valorNum ?? null
}
