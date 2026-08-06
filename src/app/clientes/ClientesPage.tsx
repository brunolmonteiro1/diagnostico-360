import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Estado, Painel, Secao } from '@/components/shared/Secao'
import { useConsulta } from '@/hooks/useConsulta'
import { useSessao } from '@/app/auth/useSessao'
import { criarCliente, listarClientes } from '@/lib/api'

const schema = z.object({
  nome_fantasia: z.string().min(1, 'Informe o nome do cliente'),
  segmento: z.string().optional(),
  porte: z.string().optional(),
  n_colaboradores: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), 'Use apenas números'),
})

type Campos = z.infer<typeof schema>

const campo =
  'border-border focus:border-accent focus:ring-accent/25 h-11 w-full border bg-white px-3 outline-none focus:ring-2'

export function ClientesPage() {
  const { sessao } = useSessao()
  const [criando, setCriando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const consulta = useConsulta(listarClientes)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Campos>({ resolver: zodResolver(schema) })

  async function aoEnviar(dados: Campos) {
    if (!sessao) return
    setErroForm(null)

    try {
      await criarCliente(
        {
          nome_fantasia: dados.nome_fantasia,
          segmento: dados.segmento || null,
          porte: dados.porte || null,
          n_colaboradores: dados.n_colaboradores
            ? Number(dados.n_colaboradores)
            : null,
        },
        sessao.user.id
      )
      reset()
      setCriando(false)
      consulta.recarregar()
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : 'Erro inesperado')
    }
  }

  return (
    <>
      <Secao
        numero="01"
        titulo="Clientes"
        descricao="Cada cliente de consultoria tem suas próprias rodadas de diagnóstico."
        acao={
          <Button type="button" onClick={() => setCriando((v) => !v)}>
            {criando ? 'Cancelar' : 'Novo cliente'}
          </Button>
        }
      />

      {criando && (
        <div className="mb-10">
          <Painel ativo>
            <form onSubmit={handleSubmit(aoEnviar)} noValidate className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="nome_fantasia" className="block text-sm font-medium">
                  Nome do cliente
                </label>
                <input id="nome_fantasia" className={campo} {...register('nome_fantasia')} />
                {errors.nome_fantasia && (
                  <p role="alert" className="text-critico text-sm">
                    {errors.nome_fantasia.message}
                  </p>
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="segmento" className="block text-sm font-medium">
                    Segmento
                  </label>
                  <input id="segmento" className={campo} {...register('segmento')} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="porte" className="block text-sm font-medium">
                    Porte
                  </label>
                  <input id="porte" className={campo} {...register('porte')} />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="n_colaboradores"
                    className="block text-sm font-medium"
                  >
                    Nº de colaboradores
                  </label>
                  <input
                    id="n_colaboradores"
                    inputMode="numeric"
                    className={campo}
                    {...register('n_colaboradores')}
                  />
                  {errors.n_colaboradores && (
                    <p role="alert" className="text-critico text-sm">
                      {errors.n_colaboradores.message}
                    </p>
                  )}
                </div>
              </div>

              {erroForm && (
                <p role="alert" className="text-critico text-sm">
                  {erroForm}
                </p>
              )}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando…' : 'Salvar cliente'}
              </Button>
            </form>
          </Painel>
        </div>
      )}

      <Estado
        carregando={consulta.carregando}
        erro={consulta.erro}
        vazio={
          consulta.dados?.length === 0 ? (
            <Painel>
              <p className="text-sem-dado text-sm">
                Nenhum cliente cadastrado ainda.
              </p>
            </Painel>
          ) : null
        }
      >
        <ul className="border-border divide-border divide-y border bg-white">
          {consulta.dados?.map((cliente) => (
            <li key={cliente.id}>
              <Link
                to={`/app/clientes/${cliente.id}`}
                className="hover:border-accent flex flex-wrap items-baseline gap-x-4 gap-y-1 border-l-[3px] border-transparent px-6 py-4"
              >
                <span className="font-heading text-lg">{cliente.nome_fantasia}</span>
                {cliente.segmento && (
                  <span className="text-sem-dado text-sm">{cliente.segmento}</span>
                )}
                {cliente.n_colaboradores != null && (
                  <span className="text-sem-dado ml-auto text-sm">
                    {cliente.n_colaboradores} colaboradores
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </Estado>
    </>
  )
}
