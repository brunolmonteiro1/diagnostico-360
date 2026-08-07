import { useMemo, useState } from 'react'
import { Estado, Painel, Secao } from '@/components/shared/Secao'
import { useConsulta } from '@/hooks/useConsulta'
import { listarPerguntas, type Pergunta } from '@/lib/api'

const ROTULO_BLOCO: Record<string, string> = {
  identificacao: 'Identificação',
  universal: 'Universal',
  area: 'Por área',
  lideranca: 'Liderança e sócios',
  encerramento: 'Encerramento',
}

const ORDEM_BLOCO = [
  'identificacao',
  'universal',
  'area',
  'lideranca',
  'encerramento',
]

function agrupar(perguntas: readonly Pergunta[]) {
  const porBloco = new Map<string, Map<string, Pergunta[]>>()

  for (const p of perguntas) {
    // Dentro de "por área", o agrupamento útil é a área, não a dimensão: é assim
    // que o consultor decide quais módulos a rodada vai ativar.
    const subgrupo =
      p.bloco === 'area' ? (p.area_scope[0] ?? 'sem área') : (p.dimensao ?? 'geral')

    if (!porBloco.has(p.bloco)) porBloco.set(p.bloco, new Map())
    const grupos = porBloco.get(p.bloco)!
    if (!grupos.has(subgrupo)) grupos.set(subgrupo, [])
    grupos.get(subgrupo)!.push(p)
  }

  return ORDEM_BLOCO.filter((b) => porBloco.has(b)).map((bloco) => ({
    bloco,
    grupos: [...porBloco.get(bloco)!.entries()],
  }))
}

function Etiqueta({
  children,
  destaque = false,
}: {
  children: React.ReactNode
  destaque?: boolean
}) {
  return (
    <span
      className={`border px-1.5 py-0.5 text-xs ${
        destaque ? 'border-accent text-accent' : 'border-border text-sem-dado'
      }`}
    >
      {children}
    </span>
  )
}

export function PerguntasPage() {
  const consulta = useConsulta(listarPerguntas)
  const [busca, setBusca] = useState('')

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const todas = consulta.dados ?? []
    if (termo === '') return todas

    return todas.filter(
      (p) =>
        p.codigo.toLowerCase().includes(termo) ||
        p.enunciado.toLowerCase().includes(termo) ||
        (p.dimensao ?? '').toLowerCase().includes(termo) ||
        p.area_scope.some((a) => a.toLowerCase().includes(termo))
    )
  }, [consulta.dados, busca])

  const agrupadas = useMemo(() => agrupar(filtradas), [filtradas])
  const total = consulta.dados?.length ?? 0
  const invertidas = (consulta.dados ?? []).filter((p) => p.invertida).length

  return (
    <>
      <Secao
        numero="04"
        titulo="Banco de perguntas"
        descricao={
          total > 0 ? (
            <>
              {total} perguntas, {invertidas} invertidas. O catálogo é compartilhado
              entre todos os clientes; o que muda por rodada são os módulos de área
              ativos.
            </>
          ) : undefined
        }
      />

      <div className="mb-8">
        <label htmlFor="busca" className="mb-2 block text-sm font-medium">
          Buscar
        </label>
        <input
          id="busca"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="código, enunciado, dimensão ou área"
          className="border-border focus:border-accent focus:ring-accent/25 h-11 w-full max-w-md border bg-white px-3 outline-none focus:ring-2"
        />
      </div>

      <div className="mb-10">
        <Painel>
          <p className="text-sem-dado text-sm">
            Esta tela é somente leitura. O banco de perguntas vale para todos os
            consultores ao mesmo tempo — editar aqui mudaria o questionário das
            rodadas de outra pessoa. Enquanto não estiver decidido quem pode alterar
            o catálogo, a escrita fica com o seed
            (<code>supabase/migrations/20260807000003_seed_perguntas.sql</code>), que
            é versionado e revisável.
          </p>
        </Painel>
      </div>

      <Estado
        carregando={consulta.carregando}
        erro={consulta.erro}
        vazio={
          total === 0 ? (
            <Painel>
              <p className="text-sem-dado text-sm">
                Nenhuma pergunta no banco. Rode a migration do seed.
              </p>
            </Painel>
          ) : filtradas.length === 0 ? (
            <Painel>
              <p className="text-sem-dado text-sm">
                Nenhuma pergunta corresponde a “{busca}”.
              </p>
            </Painel>
          ) : null
        }
      >
        <div className="space-y-12">
          {agrupadas.map(({ bloco, grupos }) => (
            <section key={bloco}>
              <h2 className="font-heading border-border mb-6 border-b pb-2 text-xl">
                {ROTULO_BLOCO[bloco] ?? bloco}
              </h2>

              <div className="space-y-8">
                {grupos.map(([subgrupo, perguntas]) => (
                  <div key={subgrupo}>
                    <h3 className="text-sem-dado mb-3 text-sm tracking-[0.15em] uppercase">
                      {subgrupo} · {perguntas.length}
                    </h3>

                    <ul className="border-border divide-border divide-y border bg-white">
                      {perguntas.map((p) => (
                        <li
                          key={p.id}
                          className={`px-5 py-4 ${p.ativa ? '' : 'opacity-50'}`}
                        >
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                            <code className="text-sem-dado text-xs">{p.codigo}</code>
                            <span className="flex-1 basis-80">{p.enunciado}</span>

                            <div className="ml-auto flex flex-wrap items-center gap-1.5">
                              <Etiqueta>{p.tipo}</Etiqueta>
                              {p.invertida && <Etiqueta destaque>invertida</Etiqueta>}
                              {Number(p.peso) > 1 && (
                                <Etiqueta destaque>peso {p.peso}</Etiqueta>
                              )}
                              {p.permite_nao_sei && <Etiqueta>não sei</Etiqueta>}
                              {p.obrigatoria && <Etiqueta>obrigatória</Etiqueta>}
                              {p.vinculo_scope.length > 0 && (
                                <Etiqueta>{p.vinculo_scope.join(', ')}</Etiqueta>
                              )}
                              {!p.ativa && <Etiqueta>inativa</Etiqueta>}
                            </div>
                          </div>

                          {p.ajuda && (
                            <p className="text-sem-dado mt-1 text-sm">{p.ajuda}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Estado>
    </>
  )
}
