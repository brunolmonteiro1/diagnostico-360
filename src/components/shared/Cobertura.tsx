import { Painel } from './Secao'
import { MINIMO_RECORTE } from '@/domain/scoring'
import type { Cobertura as CoberturaDados, Recorte } from '@/domain/cobertura'

function Barra({ valor }: { valor: number }) {
  return (
    <div className="bg-muted h-1.5 w-full">
      <div
        className="bg-accent h-full"
        style={{ width: `${Math.min(100, Math.max(0, valor))}%` }}
      />
    </div>
  )
}

function Grupo({ titulo, recortes }: { titulo: string; recortes: Recorte[] }) {
  if (recortes.length === 0) {
    return (
      <div>
        <h3 className="text-sem-dado mb-3 text-sm tracking-[0.15em] uppercase">
          {titulo}
        </h3>
        <p className="text-sem-dado text-sm">Ninguém se identificou ainda.</p>
      </div>
    )
  }

  const maior = Math.max(...recortes.map((r) => r.iniciados))

  return (
    <div>
      <h3 className="text-sem-dado mb-3 text-sm tracking-[0.15em] uppercase">
        {titulo}
      </h3>

      <ul className="space-y-3">
        {recortes.map((r) => (
          <li key={r.chave}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span>{r.chave}</span>
              <span className="text-sem-dado">
                {r.concluidos} concluído(s) de {r.iniciados}
                {r.abaixoDoMinimo && (
                  <span className="text-atencao"> · não sai no relatório</span>
                )}
              </span>
            </div>
            <div className="mt-1">
              <Barra valor={maior === 0 ? 0 : (r.concluidos / maior) * 100} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Cobertura({ dados }: { dados: CoberturaDados }) {
  return (
    <Painel>
      <div className="space-y-8">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <div>
            <p className="font-heading text-3xl leading-none">
              {dados.taxa === null ? '—' : `${Math.round(dados.taxa)}%`}
            </p>
            <p className="text-sem-dado mt-1 text-sm">taxa de resposta</p>
          </div>
          <p className="text-sem-dado text-sm">
            {dados.concluidos} concluíram · {dados.iniciados} começaram ·{' '}
            {dados.convidados} convidados
          </p>
        </div>

        {/* O aviso que justifica esta tela existir: a taxa geral pode estar boa
            e um recorte inteiro estar fora do relatório. Encerrada a rodada,
            não há mais o que corrigir. */}
        {dados.recortesSuprimidos.length > 0 && (
          <p className="border-atencao bg-white py-2 pl-3 text-sm border-l-[3px]">
            Com menos de {MINIMO_RECORTE} respostas concluídas, estes recortes não
            aparecem no relatório:{' '}
            <strong>{dados.recortesSuprimidos.join(', ')}</strong>. Vale cobrar
            antes de encerrar.
          </p>
        )}

        <div className="grid gap-8 sm:grid-cols-2">
          <Grupo titulo="Por área" recortes={dados.porArea} />
          <Grupo titulo="Por vínculo" recortes={dados.porVinculo} />
        </div>
      </div>
    </Painel>
  )
}
