import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Painel } from '@/components/shared/Secao'
import type { NarrativaRelatorio } from '@/domain/relatorio-prompt'
import { rotuloDimensao } from './faixa'

const TITULOS: { chave: keyof NarrativaRelatorio; titulo: string }[] = [
  { chave: 'sumario_executivo', titulo: 'Sumário executivo' },
  { chave: 'gargalos', titulo: 'Gargalos' },
  { chave: 'riscos_criticos', titulo: 'Riscos críticos' },
  { chave: 'o_que_funciona', titulo: 'O que funciona' },
  { chave: 'iniciativas', titulo: 'Iniciativas sugeridas' },
  { chave: 'lacunas_do_diagnostico', titulo: 'Lacunas do diagnóstico' },
]

const campoTextarea =
  'border-border focus:border-accent focus:ring-accent/25 w-full border bg-white px-3 py-2 text-sm outline-none focus:ring-2'

/**
 * Narrativa da IA em blocos editáveis. O consultor revisa e ajusta antes de
 * exportar — a saída bruta nunca vai direto para o cliente (critério de
 * pronto da Fase 6). "Salvar edições" grava em `narrativa_editada`, que passa
 * a ser o que a rota de impressão usa.
 */
export function BlocosNarrativa({
  narrativa,
  editadaAnteriormente,
  onSalvar,
}: {
  narrativa: NarrativaRelatorio
  editadaAnteriormente: boolean
  onSalvar: (narrativa: NarrativaRelatorio) => Promise<void>
}) {
  const [rascunho, setRascunho] = useState<NarrativaRelatorio>(narrativa)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const editarLista = (chave: keyof NarrativaRelatorio, texto: string) => {
    setSalvo(false)
    setRascunho((r) => ({ ...r, [chave]: texto.split('\n').filter((l) => l.trim() !== '') }))
  }

  const editarBloco = (
    chave: 'diagnostico_por_dimensao' | 'achados_por_area',
    indice: number,
    texto: string
  ) => {
    setSalvo(false)
    setRascunho((r) => ({
      ...r,
      [chave]: r[chave].map((item, i) => (i === indice ? { ...item, texto } : item)),
    }))
  }

  const salvar = async () => {
    setSalvando(true)
    await onSalvar(rascunho)
    setSalvando(false)
    setSalvo(true)
  }

  return (
    <div className="space-y-8">
      {editadaAnteriormente && (
        <p className="text-sem-dado text-sm">
          Esta narrativa já foi editada pelo consultor. O texto abaixo é a versão editada.
        </p>
      )}

      <Painel>
        <h3 className="mb-3 text-sm tracking-[0.15em] uppercase">Diagnóstico por dimensão</h3>
        <div className="space-y-4">
          {rascunho.diagnostico_por_dimensao.map((item, i) => (
            <div key={item.dimensao}>
              <label className="mb-1 block text-sm font-medium">
                {rotuloDimensao(item.dimensao)}
              </label>
              <textarea
                className={campoTextarea}
                rows={2}
                value={item.texto}
                onChange={(e) => editarBloco('diagnostico_por_dimensao', i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </Painel>

      <Painel>
        <h3 className="mb-3 text-sm tracking-[0.15em] uppercase">Achados por área</h3>
        <div className="space-y-4">
          {rascunho.achados_por_area.map((item, i) => (
            <div key={item.area}>
              <label className="mb-1 block text-sm font-medium capitalize">{item.area}</label>
              <textarea
                className={campoTextarea}
                rows={2}
                value={item.texto}
                onChange={(e) => editarBloco('achados_por_area', i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </Painel>

      {TITULOS.map(({ chave, titulo }) => (
        <Painel key={chave}>
          <label className="mb-2 block text-sm tracking-[0.15em] uppercase">{titulo}</label>
          <p className="text-sem-dado mb-2 text-xs">Um item por linha.</p>
          <textarea
            className={campoTextarea}
            rows={4}
            value={(rascunho[chave] as string[]).join('\n')}
            onChange={(e) => editarLista(chave, e.target.value)}
          />
        </Painel>
      ))}

      <div className="flex items-center gap-3">
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar edições'}
        </Button>
        {salvo && <span className="text-saudavel text-sm">Salvo.</span>}
      </div>
    </div>
  )
}
