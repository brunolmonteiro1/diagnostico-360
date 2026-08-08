import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * Teto de espera dos `findBy*` e `waitFor`.
 *
 * O padrão da Testing Library é 1 s, e isso derrubou o CI uma vez sem defeito
 * nenhum no código: o commit que falhou mexia só em arquivos .sql, e o mesmo
 * teste passou no commit anterior e no seguinte. Num runner sob carga, 1 s para
 * a promessa mockada resolver e a árvore renderizar é apertado — o próprio log
 * do CI registrava ~10 s só para levantar o jsdom.
 *
 * Levantar o teto não deixa teste que passa mais lento: `findBy` resolve assim
 * que o elemento aparece. Isto é limite, não espera fixa.
 *
 * Deliberadamente NÃO se mexe no `testTimeout` global: o que estava curto era o
 * teto por asserção. Um `testTimeout` alto mascararia teste de fato travado.
 */
configure({ asyncUtilTimeout: 5000 })

afterEach(() => {
  cleanup()
})
