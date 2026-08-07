import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Estado, Painel, Secao } from '@/components/shared/Secao'
import { useConsulta } from '@/hooks/useConsulta'
import {
  atualizarRodada,
  criarConvites,
  excluirConvite,
  listarConvites,
  listarModulosDeArea,
  listarRespondentes,
  obterRodada,
} from '@/lib/api'
import { Cobertura } from '@/components/shared/Cobertura'
import { calcularCobertura } from '@/domain/cobertura'
import {
  impedimentosParaAbrir,
  podeTransicionar,
  rotuloAcao,
  rotuloStatus,
  transicoesDe,
} from '@/domain/rodada-status'
import {
  descartarJaConvidados,
  importarConvidados,
  linkDoConvite,
} from '@/domain/importar-convidados'

const campo =
  'border-border focus:border-accent focus:ring-accent/25 w-full border bg-white px-3 py-2 outline-none focus:ring-2'

export function RodadaDetalhePage() {
  const { rodadaId = '' } = useParams()
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [salvando, setSalvando] = useState(false)

  const rodada = useConsulta(
    useCallback(() => obterRodada(rodadaId), [rodadaId]),
    [rodadaId]
  )
  const convites = useConsulta(
    useCallback(() => listarConvites(rodadaId), [rodadaId]),
    [rodadaId]
  )
  const modulos = useConsulta(listarModulosDeArea)
  const respondentes = useConsulta(
    useCallback(() => listarRespondentes(rodadaId), [rodadaId]),
    [rodadaId]
  )

  const emailsExistentes = useMemo(
    () => (convites.dados ?? []).map((c) => c.email ?? '').filter(Boolean),
    [convites.dados]
  )

  // A prévia é recalculada a cada tecla, sem tocar no banco: o consultor vê o
  // que vai acontecer antes de acontecer.
  const previa = useMemo(
    () => descartarJaConvidados(importarConvidados(texto), emailsExistentes),
    [texto, emailsExistentes]
  )

  const dados = rodada.dados
  const editavel = dados?.status === 'rascunho'

  const cobertura = useMemo(
    () =>
      calcularCobertura(
        convites.dados?.length ?? 0,
        (respondentes.dados ?? []).map((r) => ({
          areaPrincipal: r.area_principal,
          vinculo: r.vinculo,
          concluido: r.status === 'concluido',
        }))
      ),
    [convites.dados, respondentes.dados]
  )

  async function mudarStatus(para: Parameters<typeof rotuloAcao>[1]) {
    if (!dados || !podeTransicionar(dados.status, para)) return
    setErroAcao(null)
    try {
      await atualizarRodada(dados.id, {
        status: para,
        ...(para === 'aberta' ? { abertura_em: new Date().toISOString() } : {}),
      })
      rodada.recarregar()
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : 'Erro inesperado')
    }
  }

  async function salvarConfiguracao(campos: {
    prazo_em?: string | null
    mensagem_abertura?: string | null
    modulos_ativos?: string[]
    anonima?: boolean
  }) {
    if (!dados) return
    setErroAcao(null)
    setSalvando(true)
    try {
      await atualizarRodada(dados.id, campos)
      rodada.recarregar()
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : 'Erro inesperado')
    } finally {
      setSalvando(false)
    }
  }

  async function importar() {
    if (!dados || previa.convidados.length === 0) return
    setErroAcao(null)
    try {
      await criarConvites(dados.id, previa.convidados)
      setTexto('')
      convites.recarregar()
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : 'Erro inesperado')
    }
  }

  return (
    <Estado carregando={rodada.carregando} erro={rodada.erro}>
      {dados && (
        <>
          <Link
            to={`/app/clientes/${dados.cliente_id}`}
            className="text-sem-dado mb-6 inline-block text-sm underline underline-offset-4"
          >
            ← Cliente
          </Link>

          <Secao
            numero="03"
            titulo={dados.titulo}
            descricao={
              <>
                Estado: <strong>{rotuloStatus(dados.status)}</strong>
                {dados.status === 'rascunho' &&
                  ' — ainda não recebe resposta de ninguém.'}
                {dados.status === 'aberta' && ' — os links estão valendo.'}
                {dados.status === 'encerrada' && ' — não aceita mais resposta.'}
              </>
            }
            acao={
              <div className="flex gap-3">
                {transicoesDe(dados.status).map((para) => (
                  <Button
                    key={para}
                    type="button"
                    variant={para === 'arquivada' ? 'outline' : 'default'}
                    onClick={() => void mudarStatus(para)}
                  >
                    {rotuloAcao(dados.status, para)}
                  </Button>
                ))}
              </div>
            }
          />

          {erroAcao && (
            <p
              role="alert"
              className="border-critico text-critico mb-6 border-l-[3px] bg-white py-2 pl-3 text-sm"
            >
              {erroAcao}
            </p>
          )}

          {dados.status === 'rascunho' && (
            <ul className="mb-10 space-y-1">
              {impedimentosParaAbrir({
                totalConvites: convites.dados?.length ?? 0,
                modulosAtivos: dados.modulos_ativos,
              }).map((problema) => (
                <li key={problema} className="text-sem-dado text-sm">
                  · {problema}
                </li>
              ))}
            </ul>
          )}

          {/* ---------------------------------------------------------- */}
          {dados.status !== 'rascunho' && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-xl">Acompanhamento</h2>
                <Link
                  to={`/app/rodadas/${rodadaId}/relatorio`}
                  className="text-sem-dado text-sm underline underline-offset-4"
                >
                  Ver relatório →
                </Link>
              </div>
              <div className="mb-12">
                <Estado carregando={respondentes.carregando} erro={respondentes.erro}>
                  <Cobertura dados={cobertura} />
                </Estado>
              </div>
            </>
          )}

          {/* ---------------------------------------------------------- */}
          <h2 className="font-heading mb-4 text-xl">Configuração</h2>
          <div className="mb-12">
            <Painel>
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="prazo" className="block text-sm font-medium">
                      Prazo
                    </label>
                    <input
                      id="prazo"
                      type="date"
                      disabled={!editavel}
                      className={campo}
                      defaultValue={dados.prazo_em?.slice(0, 10) ?? ''}
                      onBlur={(e) =>
                        void salvarConfiguracao({
                          prazo_em: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-sm font-medium">Identificação</span>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        disabled={!editavel}
                        defaultChecked={dados.anonima}
                        onChange={(e) =>
                          void salvarConfiguracao({ anonima: e.target.checked })
                        }
                        className="accent-accent size-4"
                      />
                      Rodada anônima
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="mensagem" className="block text-sm font-medium">
                    Mensagem de abertura
                  </label>
                  <textarea
                    id="mensagem"
                    rows={4}
                    disabled={!editavel}
                    className={campo}
                    defaultValue={dados.mensagem_abertura ?? ''}
                    onBlur={(e) =>
                      void salvarConfiguracao({
                        mensagem_abertura: e.target.value || null,
                      })
                    }
                  />
                  <p className="text-sem-dado text-sm">
                    Aparece na primeira tela do respondente, junto do texto padrão.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="block text-sm font-medium">Módulos de área</span>
                  <Estado carregando={modulos.carregando} erro={modulos.erro}>
                    {modulos.dados?.length === 0 ? (
                      <p className="text-sem-dado text-sm">
                        Nenhum módulo disponível: o banco de perguntas ainda não foi
                        carregado (Fase 3). Não há o que ativar enquanto não existir
                        pergunta de área.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {modulos.dados?.map((area) => {
                          const ativo = dados.modulos_ativos.includes(area)
                          return (
                            <button
                              key={area}
                              type="button"
                              disabled={!editavel || salvando}
                              onClick={() =>
                                void salvarConfiguracao({
                                  modulos_ativos: ativo
                                    ? dados.modulos_ativos.filter((m) => m !== area)
                                    : [...dados.modulos_ativos, area],
                                })
                              }
                              className={`border px-3 py-1 text-sm ${
                                ativo
                                  ? 'border-accent bg-accent text-bg-dark'
                                  : 'border-border text-sem-dado'
                              }`}
                            >
                              {area}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </Estado>
                </div>

                {!editavel && (
                  <p className="text-sem-dado text-sm">
                    A configuração fica travada depois que a rodada abre — mudar o
                    questionário no meio faria as respostas deixarem de ser
                    comparáveis entre si.
                  </p>
                )}
              </div>
            </Painel>
          </div>

          {/* ---------------------------------------------------------- */}
          <h2 className="font-heading mb-4 text-xl">
            Convidados{' '}
            <span className="text-sem-dado text-base">
              ({convites.dados?.length ?? 0})
            </span>
          </h2>

          {editavel && (
            <div className="mb-6">
              <Painel ativo>
                <div className="space-y-4">
                  <label htmlFor="colagem" className="block text-sm font-medium">
                    Cole os e-mails ou um CSV
                  </label>
                  <textarea
                    id="colagem"
                    rows={6}
                    className={`${campo} font-mono text-sm`}
                    placeholder={
                      'ana@empresa.com\nBruno Lima <bruno@empresa.com>\nnome,email\nCarla,carla@empresa.com'
                    }
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                  />

                  {texto.trim() !== '' && (
                    <div className="text-sm">
                      <p>
                        <strong>{previa.convidados.length}</strong> convidado(s) serão
                        criados
                        {previa.ignorados.length > 0 && (
                          <>
                            {' · '}
                            <span className="text-sem-dado">
                              {previa.ignorados.length} linha(s) fora
                            </span>
                          </>
                        )}
                      </p>

                      {previa.ignorados.length > 0 && (
                        <ul className="text-sem-dado mt-2 space-y-1">
                          {previa.ignorados.map((i, indice) => (
                            <li key={`${i.conteudo}-${indice}`}>
                              {i.linha > 0 && `linha ${i.linha}: `}
                              <span className="font-mono">{i.conteudo}</span> — {i.motivo}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <Button
                    type="button"
                    disabled={previa.convidados.length === 0}
                    onClick={() => void importar()}
                  >
                    Importar {previa.convidados.length || ''} convidado(s)
                  </Button>
                </div>
              </Painel>
            </div>
          )}

          <Estado
            carregando={convites.carregando}
            erro={convites.erro}
            vazio={
              convites.dados?.length === 0 ? (
                <Painel>
                  <p className="text-sem-dado text-sm">
                    Nenhum convidado importado ainda.
                  </p>
                </Painel>
              ) : null
            }
          >
            <ul className="border-border divide-border divide-y border bg-white">
              {convites.dados?.map((convite) => (
                <li
                  key={convite.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 text-sm"
                >
                  <span className="min-w-52">{convite.email}</span>
                  {convite.nome_sugerido && (
                    <span className="text-sem-dado">{convite.nome_sugerido}</span>
                  )}
                  <code className="text-sem-dado ml-auto truncate text-xs">
                    {linkDoConvite(window.location.origin, convite.token)}
                  </code>
                  <button
                    type="button"
                    onClick={() =>
                      void navigator.clipboard?.writeText(
                        linkDoConvite(window.location.origin, convite.token)
                      )
                    }
                    className="hover:text-accent underline underline-offset-4"
                  >
                    Copiar link
                  </button>
                  {editavel && (
                    <button
                      type="button"
                      onClick={() =>
                        void excluirConvite(convite.id).then(convites.recarregar)
                      }
                      className="text-sem-dado hover:text-critico underline underline-offset-4"
                    >
                      Remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Estado>

          <p className="text-sem-dado mt-4 text-sm">
            O link só vai abrir de verdade quando o formulário do respondente
            existir (Fase 4). O token já é definitivo: é a credencial da pessoa.
          </p>
        </>
      )}
    </Estado>
  )
}
