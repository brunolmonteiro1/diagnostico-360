import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Estado, Painel, Secao } from '@/components/shared/Secao'
import { useConsulta } from '@/hooks/useConsulta'
import { criarRodada, listarRodadas, obterCliente } from '@/lib/api'
import { rotuloStatus } from '@/domain/rodada-status'

const schema = z.object({
  titulo: z.string().min(1, 'Dê um título à rodada'),
})

type Campos = z.infer<typeof schema>

const campo =
  'border-border focus:border-accent focus:ring-accent/25 h-11 w-full border bg-white px-3 outline-none focus:ring-2'

export function ClienteDetalhePage() {
  const { clienteId = '' } = useParams()
  const [criando, setCriando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  const cliente = useConsulta(
    useCallback(() => obterCliente(clienteId), [clienteId]),
    [clienteId]
  )
  const rodadas = useConsulta(
    useCallback(() => listarRodadas(clienteId), [clienteId]),
    [clienteId]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Campos>({ resolver: zodResolver(schema) })

  async function aoEnviar(dados: Campos) {
    setErroForm(null)
    try {
      await criarRodada({ cliente_id: clienteId, titulo: dados.titulo })
      reset()
      setCriando(false)
      rodadas.recarregar()
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : 'Erro inesperado')
    }
  }

  return (
    <>
      <Link to="/app/clientes" className="text-sem-dado mb-6 inline-block text-sm underline underline-offset-4">
        ← Clientes
      </Link>

      <Estado carregando={cliente.carregando} erro={cliente.erro}>
        <Secao
          numero="02"
          titulo={cliente.dados?.nome_fantasia ?? ''}
          descricao={
            [cliente.dados?.segmento, cliente.dados?.porte]
              .filter(Boolean)
              .join(' · ') || undefined
          }
          acao={
            <Button type="button" onClick={() => setCriando((v) => !v)}>
              {criando ? 'Cancelar' : 'Nova rodada'}
            </Button>
          }
        />
      </Estado>

      {criando && (
        <div className="mb-10">
          <Painel ativo>
            <form onSubmit={handleSubmit(aoEnviar)} noValidate className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="titulo" className="block text-sm font-medium">
                  Título da rodada
                </label>
                <input
                  id="titulo"
                  className={campo}
                  placeholder="Diagnóstico 360 — 2026"
                  {...register('titulo')}
                />
                {errors.titulo && (
                  <p role="alert" className="text-critico text-sm">
                    {errors.titulo.message}
                  </p>
                )}
                <p className="text-sem-dado text-sm">
                  A rodada nasce em rascunho. Prazo, módulos, mensagem de abertura e
                  convidados são configurados na tela dela.
                </p>
              </div>

              {erroForm && (
                <p role="alert" className="text-critico text-sm">
                  {erroForm}
                </p>
              )}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando…' : 'Criar rodada'}
              </Button>
            </form>
          </Painel>
        </div>
      )}

      <Estado
        carregando={rodadas.carregando}
        erro={rodadas.erro}
        vazio={
          rodadas.dados?.length === 0 ? (
            <Painel>
              <p className="text-sem-dado text-sm">
                Nenhuma rodada para este cliente ainda.
              </p>
            </Painel>
          ) : null
        }
      >
        <ul className="border-border divide-border divide-y border bg-white">
          {rodadas.dados?.map((rodada) => (
            <li key={rodada.id}>
              <Link
                to={`/app/rodadas/${rodada.id}`}
                className="hover:border-accent flex flex-wrap items-baseline gap-x-4 gap-y-1 border-l-[3px] border-transparent px-6 py-4"
              >
                <span className="font-heading text-lg">{rodada.titulo}</span>
                <span className="text-sem-dado text-sm">
                  {rotuloStatus(rodada.status)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Estado>
    </>
  )
}
