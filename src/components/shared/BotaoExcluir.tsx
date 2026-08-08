import { useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Exclusão em dois passos, com o efeito em cascata escrito por extenso.
 *
 * Apagar um cliente aqui não apaga só o cliente: leva rodadas, convites,
 * respondentes, respostas e relatórios junto (cascata do schema). Quem clica
 * precisa ler isso ANTES, não descobrir depois — não há desfazer.
 */
export function BotaoExcluir({
  rotulo,
  o_que,
  cascata,
  onConfirmar,
}: {
  /** Texto do botão em repouso. */
  rotulo: string
  /** O que será apagado, em nome próprio: "o cliente Acme", "a rodada Q1". */
  o_que: string
  /** O que vai junto na cascata. Lista vazia = nada além do próprio registro. */
  cascata: string[]
  onConfirmar: () => Promise<void>
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const excluir = async () => {
    setExcluindo(true)
    setErro(null)
    try {
      await onConfirmar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir')
      setExcluindo(false)
      setConfirmando(false)
    }
  }

  if (!confirmando) {
    return (
      <div>
        <Button variant="destructive" onClick={() => setConfirmando(true)}>
          {rotulo}
        </Button>
        {erro && (
          <p role="alert" className="text-critico mt-2 text-sm">
            {erro}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="border-critico bg-white p-4 border-l-[3px]">
      <p className="text-sm">
        Excluir <strong>{o_que}</strong> em definitivo?
      </p>

      {cascata.length > 0 && (
        <>
          <p className="text-sem-dado mt-2 text-sm">Isto também apaga:</p>
          <ul className="text-sem-dado mt-1 list-disc pl-5 text-sm">
            {cascata.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}

      <p className="text-sem-dado mt-2 text-sm">Não há como desfazer.</p>

      <div className="mt-4 flex gap-3">
        <Button variant="destructive" onClick={() => void excluir()} disabled={excluindo}>
          {excluindo ? 'Excluindo…' : 'Sim, excluir'}
        </Button>
        <Button variant="outline" onClick={() => setConfirmando(false)} disabled={excluindo}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
