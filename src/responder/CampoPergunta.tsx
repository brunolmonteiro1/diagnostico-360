import type { PerguntaServidor } from './api'

/**
 * Renderiza uma pergunta e a opção "Não sei".
 *
 * A regra que este componente existe para garantir: **"Não sei / Não tenho
 * visibilidade sobre isso" fica FORA da escala, abaixo de uma linha
 * divisória, em cinza.** Se ela parecer um valor intermediário — um sexto
 * botão no meio dos cinco — as pessoas vão marcá-la como "mais ou menos", e
 * aí ela deixa de medir visibilidade e passa a medir maturidade média. Isso
 * destruiria o diagnóstico em silêncio.
 */

export type ValorResposta = {
  naoSei: boolean
  naoExiste: boolean
  valorNum: number | null
  valorTexto: string | null
  valorOpcoes: string[] | null
}

export const VAZIO: ValorResposta = {
  naoSei: false,
  naoExiste: false,
  valorNum: null,
  valorTexto: null,
  valorOpcoes: null,
}

const ESCALA_LIKERT = [
  { valor: 1, rotulo: 'Discordo totalmente' },
  { valor: 2, rotulo: 'Discordo em parte' },
  { valor: 3, rotulo: 'Mais ou menos' },
  { valor: 4, rotulo: 'Concordo em parte' },
  { valor: 5, rotulo: 'Concordo totalmente' },
]

const ESCALA_FREQUENCIA = [
  { valor: 1, rotulo: 'Nunca' },
  { valor: 2, rotulo: 'Raramente' },
  { valor: 3, rotulo: 'Às vezes' },
  { valor: 4, rotulo: 'Com frequência' },
  { valor: 5, rotulo: 'Sempre' },
]

// Alvo de 44px e sem rolagem horizontal: empilhada no celular, em linha no
// desktop. A maioria vai responder isto no telefone.
const OPCAO =
  'flex min-h-11 w-full items-center gap-3 border px-3 py-2 text-left text-sm transition-colors sm:flex-col sm:justify-center sm:gap-1 sm:px-2 sm:text-center'

const OPCAO_ATIVA = 'border-accent bg-accent/10'
const OPCAO_INATIVA = 'border-border bg-white hover:border-accent/50'

const CAMPO =
  'border-border focus:border-accent focus:ring-accent/25 min-h-11 w-full border bg-white px-3 py-2 outline-none focus:ring-2'

export function CampoPergunta({
  pergunta,
  valor,
  aoMudar,
}: {
  pergunta: PerguntaServidor
  valor: ValorResposta
  aoMudar: (novo: ValorResposta) => void
}) {
  const desabilitado = valor.naoSei || valor.naoExiste

  function escolherNumero(n: number) {
    aoMudar({ ...VAZIO, valorNum: n })
  }

  function alternarNaoSei() {
    // Marcar "não sei" limpa os campos de valor e a outra marcação: não dá para
    // ter as duas coisas, e a constraint no banco recusaria de qualquer forma.
    aoMudar(valor.naoSei ? VAZIO : { ...VAZIO, naoSei: true })
  }

  function alternarNaoExiste() {
    aoMudar(valor.naoExiste ? VAZIO : { ...VAZIO, naoExiste: true })
  }

  const escala =
    pergunta.tipo === 'likert5'
      ? ESCALA_LIKERT
      : pergunta.tipo === 'frequencia5'
        ? ESCALA_FREQUENCIA
        : null

  return (
    <fieldset
      className={`card-pergunta-ativo border-border border bg-white p-5 ${
        valor.naoSei ? 'opacity-90' : ''
      }`}
    >
      <legend className="sr-only">{pergunta.enunciado}</legend>

      <p className="font-medium">{pergunta.enunciado}</p>
      {pergunta.ajuda && (
        <p className="text-sem-dado mt-1 text-sm">{pergunta.ajuda}</p>
      )}

      <div className={`mt-4 ${desabilitado ? 'pointer-events-none opacity-40' : ''}`}>
        {escala && (
          <div className="grid gap-2 sm:grid-cols-5">
            {escala.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                aria-pressed={valor.valorNum === opcao.valor}
                onClick={() => escolherNumero(opcao.valor)}
                className={`${OPCAO} ${
                  valor.valorNum === opcao.valor ? OPCAO_ATIVA : OPCAO_INATIVA
                }`}
              >
                <span className="font-heading text-lg leading-none">{opcao.valor}</span>
                <span className="text-sem-dado text-xs">{opcao.rotulo}</span>
              </button>
            ))}
          </div>
        )}

        {pergunta.tipo === 'escala0a10' && (
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                type="button"
                aria-pressed={valor.valorNum === n}
                onClick={() => escolherNumero(n)}
                className={`flex min-h-11 items-center justify-center border text-sm ${
                  valor.valorNum === n ? OPCAO_ATIVA : OPCAO_INATIVA
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {pergunta.tipo === 'unica' && pergunta.opcoes && (
          <div className="grid gap-2">
            {pergunta.opcoes.map((opcao) => {
              const marcada =
                typeof opcao.valor === 'number'
                  ? valor.valorNum === opcao.valor
                  : valor.valorTexto === String(opcao.valor)

              return (
                <button
                  key={String(opcao.valor)}
                  type="button"
                  aria-pressed={marcada}
                  onClick={() =>
                    typeof opcao.valor === 'number'
                      ? escolherNumero(opcao.valor)
                      : aoMudar({ ...VAZIO, valorTexto: String(opcao.valor) })
                  }
                  className={`flex min-h-11 items-center border px-3 py-2 text-left text-sm ${
                    marcada ? OPCAO_ATIVA : OPCAO_INATIVA
                  }`}
                >
                  {opcao.rotulo}
                </button>
              )
            })}
          </div>
        )}

        {pergunta.tipo === 'multipla' && pergunta.opcoes && (
          <div className="grid gap-2">
            {pergunta.opcoes.map((opcao) => {
              const chave = String(opcao.valor)
              const marcada = valor.valorOpcoes?.includes(chave) ?? false

              return (
                <label
                  key={chave}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 border px-3 py-2 text-sm ${
                    marcada ? OPCAO_ATIVA : OPCAO_INATIVA
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() => {
                      const atuais = valor.valorOpcoes ?? []
                      const novas = marcada
                        ? atuais.filter((v) => v !== chave)
                        : [...atuais, chave]
                      aoMudar({ ...VAZIO, valorOpcoes: novas.length > 0 ? novas : null })
                    }}
                    className="accent-accent size-4"
                  />
                  {opcao.rotulo}
                </label>
              )
            })}
          </div>
        )}

        {pergunta.tipo === 'texto_curto' && (
          <input
            type="text"
            className={CAMPO}
            value={valor.valorTexto ?? ''}
            onChange={(e) => aoMudar({ ...VAZIO, valorTexto: e.target.value })}
          />
        )}

        {pergunta.tipo === 'numero' && (
          <input
            type="number"
            inputMode="numeric"
            className={`${CAMPO} max-w-32`}
            value={valor.valorNum ?? ''}
            onChange={(e) =>
              aoMudar({
                ...VAZIO,
                valorNum: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          />
        )}

        {pergunta.tipo === 'texto_longo' && (
          // Sem validação de tamanho mínimo, aqui nem em lugar nenhum:
          // deixar em branco é resposta válida e é dado.
          <textarea
            rows={4}
            className={CAMPO}
            value={valor.valorTexto ?? ''}
            onChange={(e) => aoMudar({ ...VAZIO, valorTexto: e.target.value })}
          />
        )}
      </div>

      {(pergunta.permite_nao_sei || pergunta.permite_nao_existe) && (
        <>
          <hr className="border-border mt-5" />

          {pergunta.permite_nao_sei && (
            <button
              type="button"
              aria-pressed={valor.naoSei}
              onClick={alternarNaoSei}
              className={`mt-3 flex min-h-11 w-full items-center gap-3 border px-3 py-2 text-left text-sm ${
                valor.naoSei
                  ? 'border-sem-dado bg-sem-dado/10 text-foreground'
                  : 'border-transparent text-sem-dado hover:border-sem-dado/40'
              }`}
            >
              <span
                aria-hidden
                className={`size-4 shrink-0 border ${
                  valor.naoSei ? 'border-sem-dado bg-sem-dado' : 'border-sem-dado'
                }`}
              />
              Não sei / Não tenho visibilidade sobre isso
            </button>
          )}

          {/* Fica junto do "não sei" — fora da escala, abaixo da linha — pelo
              mesmo motivo: se parecer um ponto da régua, vira "mais ou menos".
              Mas em âmbar, não em cinza, porque as duas dizem coisas opostas:
              esta É uma resposta, e uma resposta ruim. */}
          {pergunta.permite_nao_existe && (
            <button
              type="button"
              aria-pressed={valor.naoExiste}
              onClick={alternarNaoExiste}
              className={`mt-2 flex min-h-11 w-full items-center gap-3 border px-3 py-2 text-left text-sm ${
                valor.naoExiste
                  ? 'border-atencao bg-atencao/10 text-foreground'
                  : 'border-transparent text-sem-dado hover:border-atencao/40'
              }`}
            >
              <span
                aria-hidden
                className={`size-4 shrink-0 border ${
                  valor.naoExiste ? 'border-atencao bg-atencao' : 'border-atencao/60'
                }`}
              />
              Não existe atualmente na empresa
            </button>
          )}
        </>
      )}
    </fieldset>
  )
}
