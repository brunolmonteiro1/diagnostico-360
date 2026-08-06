import { useCallback, useEffect, useState } from 'react'

type Estado<T> = {
  dados: T | null
  carregando: boolean
  erro: string | null
}

/**
 * Busca de dados mínima: carregando, erro e recarregar.
 *
 * Não é um substituto de biblioteca de cache — quando as telas precisarem de
 * revalidação, deduplicação e cache compartilhado, a conversa é trocar isto por
 * uma dependência de verdade, não engordar este arquivo.
 */
export function useConsulta<T>(
  consultar: () => Promise<T>,
  dependencias: readonly unknown[] = []
) {
  const [estado, setEstado] = useState<Estado<T>>({
    dados: null,
    carregando: true,
    erro: null,
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const executar = useCallback(consultar, dependencias)

  const recarregar = useCallback(() => {
    let ativo = true
    setEstado((anterior) => ({ ...anterior, carregando: true, erro: null }))

    executar()
      .then((dados) => {
        if (ativo) setEstado({ dados, carregando: false, erro: null })
      })
      .catch((e: unknown) => {
        if (!ativo) return
        setEstado({
          dados: null,
          carregando: false,
          erro: e instanceof Error ? e.message : 'Erro inesperado',
        })
      })

    return () => {
      ativo = false
    }
  }, [executar])

  useEffect(() => recarregar(), [recarregar])

  return { ...estado, recarregar }
}
