import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useLocation } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useSessao } from './useSessao'

const schema = z.object({
  email: z.email('Informe um e-mail válido'),
  senha: z.string().min(1, 'Informe a senha'),
})

type Campos = z.infer<typeof schema>

export function LoginPage() {
  const { sessao, carregando, entrar } = useSessao()
  const location = useLocation()
  const [erro, setErro] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Campos>({ resolver: zodResolver(schema) })

  if (!carregando && sessao) {
    const destino = (location.state as { de?: string } | null)?.de ?? '/app'
    return <Navigate to={destino} replace />
  }

  async function aoEnviar({ email, senha }: Campos) {
    setErro(null)
    try {
      await entrar(email, senha)
    } catch {
      // Mensagem única de propósito: dizer qual dos dois está errado entrega a
      // quem tenta adivinhar a informação de que o e-mail existe.
      setErro('E-mail ou senha incorretos.')
    }
  }

  return (
    <main className="grade-blueprint flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="relative isolate mb-12">
          <span aria-hidden className="numero-secao absolute -top-2 -left-5 -z-10">
            00
          </span>
          <div className="bg-accent mb-4 h-[3px] w-10" />
          <p className="text-sem-dado text-sm tracking-[0.2em] uppercase">
            Ethos Lab
          </p>
          <h1 className="mt-1 text-2xl">Diagnóstico 360</h1>
        </div>

        <form
          onSubmit={handleSubmit(aoEnviar)}
          noValidate
          className="border-border card-pergunta-ativo space-y-6 border bg-white p-8"
        >
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              className="border-border focus:border-accent h-11 w-full border bg-white px-3 outline-none focus:ring-accent/25 focus:ring-2"
              {...register('email')}
            />
            {errors.email && (
              <p role="alert" className="text-critico text-sm">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="senha" className="block text-sm font-medium">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.senha)}
              className="border-border focus:border-accent h-11 w-full border bg-white px-3 outline-none focus:ring-accent/25 focus:ring-2"
              {...register('senha')}
            />
            {errors.senha && (
              <p role="alert" className="text-critico text-sm">
                {errors.senha.message}
              </p>
            )}
          </div>

          {erro && (
            <p
              role="alert"
              className="border-critico text-critico border-l-[3px] bg-white py-2 pl-3 text-sm"
            >
              {erro}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="text-sem-dado mt-8 text-sm">
          Acesso restrito à equipe de consultoria.
        </p>
      </div>
    </main>
  )
}
