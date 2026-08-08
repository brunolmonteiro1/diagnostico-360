import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Estado, Painel, Secao } from '@/components/shared/Secao'
import { useConsulta } from '@/hooks/useConsulta'
import { listarRespostasDaRodada, obterRodada } from '@/lib/api'
import {
  agruparPorRespondente,
  cruzarPorPergunta,
  formatarValor,
  montarTextoParaIa,
  type GrupoRespondente,
  type PerguntaExport,
} from '@/domain/exportar-respostas'

/**
 * Leitura das respostas cruas da rodada.
 *
 * Existe porque com amostra pequena o relatório suprime tudo (corretamente), e
 * o consultor ainda precisa ler o que foi respondido. A RLS já dava o acesso;
 * faltava a tela.
 */
type Visao = 'pessoa' | 'pergunta'

export function RespostasPage() {
  const { rodadaId = '' } = useParams()
  const [identificar, setIdentificar] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [visao, setVisao] = useState<Visao>('pessoa')

  const rodada = useConsulta(useCallback(() => obterRodada(rodadaId), [rodadaId]), [rodadaId])
  const dados = useConsulta(
    useCallback(() => listarRespostasDaRodada(rodadaId), [rodadaId]),
    [rodadaId]
  )

  const grupos = useMemo<GrupoRespondente[]>(() => {
    if (!dados.dados) return []

    return agruparPorRespondente(
      dados.dados.respondentes.map((r) => ({
        id: r.id,
        nome: r.nome,
        email: r.email,
        cargo: r.cargo,
        areaPrincipal: r.area_principal,
        vinculo: r.vinculo,
        status: r.status,
      })),
      dados.dados.respostas.map((r) => ({
        respondenteId: r.respondente_id,
        perguntaId: r.pergunta_id,
        naoSei: r.nao_sei,
        naoExiste: r.nao_existe,
        valorNum: r.valor_num === null ? null : Number(r.valor_num),
        valorTexto: r.valor_texto,
        valorOpcoes: r.valor_opcoes,
      })),
      dados.dados.perguntas.map(
        (p): PerguntaExport => ({
          id: p.id,
          codigo: p.codigo,
          enunciado: p.enunciado,
          dimensao: p.dimensao,
          bloco: p.bloco,
          tipo: p.tipo,
          ordem: p.ordem,
          opcoes: p.opcoes as PerguntaExport['opcoes'],
        })
      )
    )
  }, [dados.dados])

  const texto = useMemo(
    () => montarTextoParaIa(grupos, { incluirIdentificacao: identificar }),
    [grupos, identificar]
  )

  const copiar = async () => {
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const baixar = () => {
    const blob = new Blob([texto], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `respostas-${rodada.dados?.titulo ?? rodadaId}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <Link
        to={`/app/rodadas/${rodadaId}`}
        className="text-sem-dado mb-6 inline-block text-sm underline underline-offset-4"
      >
        ← Rodada
      </Link>

      <Secao
        numero="07"
        titulo="Respostas"
        descricao={
          <>
            O que cada pessoa respondeu, na ordem do questionário. Use quando a
            amostra ainda for pequena demais para o relatório dizer qualquer coisa.
          </>
        }
        acao={
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={baixar}>
              Baixar .md
            </Button>
            <Button onClick={() => void copiar()}>
              {copiado ? 'Copiado!' : 'Copiar para IA'}
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex gap-2">
        {(
          [
            ['pessoa', 'Por pessoa'],
            ['pergunta', 'Por pergunta'],
          ] as const
        ).map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            aria-pressed={visao === chave}
            onClick={() => setVisao(chave)}
            className={`border px-3 py-2 text-sm ${
              visao === chave
                ? 'border-accent bg-accent/10'
                : 'border-border bg-white hover:border-accent/50'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <Painel>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={identificar}
            onChange={(e) => setIdentificar(e.target.checked)}
          />
          <span>
            Incluir nome e cargo no texto copiado
            <span className="text-sem-dado block">
              Desligado, cada pessoa vira "Respondente 1", "Respondente 2" — área e
              vínculo continuam, que é o que permite recorte. Ligue só se você
              precisa mesmo da identidade no destino. Colar resposta identificada
              num chat externo entrega a um terceiro um dado que foi coletado sob
              promessa de sigilo; o e-mail nunca é incluído, nos dois modos.
            </span>
          </span>
        </label>
      </Painel>

      <div className="mt-8">
        <Estado
          carregando={dados.carregando}
          erro={dados.erro}
          vazio={
            grupos.length === 0 ? (
              <Painel>
                <p className="text-sem-dado text-sm">
                  Ninguém começou a responder esta rodada ainda.
                </p>
              </Painel>
            ) : undefined
          }
        >
          {visao === 'pessoa' ? (
            <div className="space-y-8">
              {grupos.map((grupo, i) => (
                <CartaoRespondente
                  key={grupo.respondente.id}
                  grupo={grupo}
                  indice={i + 1}
                  identificar={identificar}
                />
              ))}
            </div>
          ) : (
            <MatrizPorPergunta grupos={grupos} identificar={identificar} />
          )}
        </Estado>
      </div>
    </div>
  )
}

/**
 * Uma linha por pergunta, uma coluna por pessoa.
 *
 * É a leitura que a amostra pequena pede: sócio marcando 5 e quem executa
 * marcando 1 na mesma frase é o achado, e ele desaparece quando cada pessoa
 * está numa seção diferente da página.
 */
function MatrizPorPergunta({
  grupos,
  identificar,
}: {
  grupos: GrupoRespondente[]
  identificar: boolean
}) {
  const [soDivergentes, setSoDivergentes] = useState(false)

  const linhas = useMemo(() => cruzarPorPergunta(grupos), [grupos])
  const visiveis = soDivergentes ? linhas.filter((l) => l.divergente) : linhas
  const totalDivergentes = linhas.filter((l) => l.divergente).length

  return (
    <div>
      <label className="mb-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={soDivergentes}
          onChange={(e) => setSoDivergentes(e.target.checked)}
          className="accent-accent size-4"
        />
        Mostrar só onde há divergência
        <span className="text-sem-dado">
          ({totalDivergentes} de {linhas.length})
        </span>
      </label>

      {visiveis.length === 0 ? (
        <Painel>
          <p className="text-sem-dado text-sm">
            {soDivergentes
              ? 'Nenhuma pergunta com divergência relevante entre quem respondeu.'
              : 'Ninguém respondeu nada ainda.'}
          </p>
        </Painel>
      ) : (
        <div className="border-border overflow-x-auto border bg-white">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="text-sem-dado p-3 text-left font-normal">Pergunta</th>
                {grupos.map((g, i) => (
                  <th key={g.respondente.id} className="p-3 text-left font-medium">
                    {identificar && g.respondente.nome
                      ? g.respondente.nome
                      : `Resp. ${i + 1}`}
                    <span className="text-sem-dado block text-xs font-normal">
                      {g.respondente.vinculo ?? '—'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiveis.map((linha) => (
                <tr
                  key={linha.pergunta.id}
                  className={`border-border border-b last:border-0 ${
                    linha.divergente ? 'bg-atencao/5' : ''
                  }`}
                >
                  <td className="p-3 align-top">
                    {linha.divergente && (
                      <span
                        aria-label="divergência"
                        className="bg-atencao mr-2 inline-block size-2 align-middle"
                      />
                    )}
                    <span className="text-sem-dado">{linha.pergunta.codigo}</span>{' '}
                    {linha.pergunta.enunciado}
                  </td>
                  {linha.celulas.map((c, i) => (
                    <td
                      key={grupos[i].respondente.id}
                      className={`p-3 align-top ${
                        c === null
                          ? 'text-sem-dado'
                          : c.naoSei
                            ? 'text-sem-dado italic'
                            : c.naoExiste
                              ? 'text-atencao font-medium'
                              : ''
                      }`}
                    >
                      {/* Traço para "não se aplica a esta pessoa" — nunca vazio,
                          que se confundiria com "não respondeu". */}
                      {c === null ? '—' : formatarValor(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CartaoRespondente({
  grupo,
  indice,
  identificar,
}: {
  grupo: GrupoRespondente
  indice: number
  identificar: boolean
}) {
  const { respondente } = grupo

  const contexto = [
    respondente.areaPrincipal,
    respondente.vinculo,
    respondente.status === 'concluido' ? 'concluído' : 'em andamento',
  ].filter(Boolean)

  return (
    <Painel>
      <div className="border-border mb-4 border-b pb-3">
        <h2 className="text-lg">
          {identificar && respondente.nome ? respondente.nome : `Respondente ${indice}`}
        </h2>
        <p className="text-sem-dado mt-1 text-sm">
          {contexto.join(' · ')}
          {identificar && respondente.cargo && ` · ${respondente.cargo}`}
        </p>
      </div>

      {grupo.respostas.length === 0 ? (
        <p className="text-sem-dado text-sm">Nenhuma resposta registrada.</p>
      ) : (
        <dl className="space-y-3">
          {grupo.respostas.map((r) => {
            // Texto livre é o que o consultor mais quer ler quando a amostra
            // ainda não sustenta número — ganha largura inteira e destaque, em
            // vez de ser espremido na coluna da direita.
            const aberta = r.pergunta.tipo === 'texto_longo' || r.pergunta.tipo === 'texto_curto'
            const temTexto = !r.naoSei && r.valorTexto !== null && r.valorTexto !== ''

            if (aberta && temTexto) {
              return (
                <div key={r.perguntaId} className="border-accent border-l-[3px] pl-3">
                  <dt className="text-sm">
                    <span className="text-sem-dado">{r.pergunta.codigo}</span>{' '}
                    {r.pergunta.enunciado}
                  </dt>
                  <dd className="mt-1 text-sm whitespace-pre-wrap">{r.valorTexto}</dd>
                </div>
              )
            }

            return (
              <div key={r.perguntaId} className="grid gap-1 sm:grid-cols-[1fr_auto] sm:gap-4">
                <dt className="text-sm">
                  <span className="text-sem-dado">{r.pergunta.codigo}</span>{' '}
                  {r.pergunta.enunciado}
                </dt>
                <dd
                  className={`text-sm sm:text-right ${
                    r.naoSei
                      ? 'text-sem-dado italic'
                      : r.naoExiste
                        ? 'text-atencao font-medium'
                        : 'font-medium'
                  }`}
                >
                  {formatarValor(r)}
                </dd>
              </div>
            )
          })}
        </dl>
      )}
    </Painel>
  )
}
