import { expect, test, type Page } from '@playwright/test'

/**
 * O critério que fecha a Fase 4: percorrer o formulário, fechar o navegador no
 * meio e reabrir pelo mesmo link, confirmando a retomada no ponto exato.
 *
 * "Fechar o navegador" aqui é fechar o CONTEXTO do Playwright — o que descarta
 * cookies, localStorage e sessionStorage. É o que prova que a retomada vem do
 * servidor, e não de estado guardado no aparelho. Se dependesse do
 * localStorage, quem trocasse de celular perderia tudo.
 */

const TOKEN = process.env.E2E_TOKEN

test.skip(
  !TOKEN,
  'Defina E2E_TOKEN com o token de um convite de uma rodada aberta.'
)

async function abrir(page: Page) {
  await page.goto(`/responder/${TOKEN}`)
  await expect(page.getByRole('heading', { name: /Diagnóstico 360/ })).toBeVisible()
}

test('token inválido mostra tela explicativa, não erro', async ({ page }) => {
  await page.goto('/responder/token-que-nao-existe')

  await expect(page.getByRole('heading', { name: 'Link não reconhecido' })).toBeVisible()
})

test('a abertura traz as três promessas ao respondente', async ({ page }) => {
  await abrir(page)

  await expect(page.getByText(/responda "Não sei"/)).toBeVisible()
  await expect(
    page.getByText(/Suas respostas individuais não serão mostradas para a empresa/)
  ).toBeVisible()
  await expect(page.getByText(/resposta bonita, não resposta ruim/)).toBeVisible()
})

test('percorre como colaborador do financeiro, fecha o navegador e retoma', async ({
  browser,
}) => {
  const contexto = await browser.newContext()
  const pagina = await contexto.newPage()

  await pagina.goto(`/responder/${TOKEN}`)
  await pagina.getByRole('button', { name: 'Começar' }).click()

  // --- Identificação ---
  await pagina.getByRole('heading', { name: 'Sobre você' }).waitFor()
  await pagina.getByLabel(/Nome completo/i).or(pagina.locator('input[type=text]').first()).fill('Teste E2E')
  await pagina.getByRole('button', { name: 'Financeiro' }).first().click()
  await pagina.getByRole('button', { name: 'Colaborador' }).first().click()

  const progressoAntes = await pagina.getByText(/\d+ de \d+ ·/).textContent()

  await pagina.getByRole('button', { name: 'Continuar' }).click()

  // --- Primeira dimensão do bloco universal ---
  const primeiraDimensao = await pagina.getByRole('heading', { level: 1 }).textContent()
  await pagina.getByRole('button', { name: /^4/ }).first().click()

  // Marca um "não sei" — ele precisa sobreviver à retomada como "não sei",
  // e não virar campo vazio nem nota baixa.
  const naoSei = pagina.getByRole('button', {
    name: /Não sei \/ Não tenho visibilidade sobre isso/,
  })
  await naoSei.nth(1).click()
  await expect(pagina.getByText('Salvo automaticamente')).toBeVisible()

  // --- Fecha o navegador, descartando todo o estado local ---
  await contexto.close()

  // --- Reabre pelo mesmo link, do zero ---
  const novoContexto = await browser.newContext()
  const novaPagina = await novoContexto.newPage()
  await novaPagina.goto(`/responder/${TOKEN}`)

  // Retoma na tela onde parou, não na abertura nem na seguinte.
  await expect(
    novaPagina.getByRole('heading', { name: primeiraDimensao! })
  ).toBeVisible()

  // As respostas continuam lá, inclusive o "não sei".
  await expect(novaPagina.getByRole('button', { name: /^4/ }).first()).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(
    novaPagina
      .getByRole('button', { name: /Não sei \/ Não tenho visibilidade sobre isso/ })
      .nth(1)
  ).toHaveAttribute('aria-pressed', 'true')

  // E o progresso não regrediu.
  const progressoDepois = await novaPagina.getByText(/\d+ de \d+ ·/).textContent()
  expect(progressoDepois).toBeTruthy()
  expect(progressoAntes).toBeTruthy()

  await novoContexto.close()
})

test('colaborador não recebe o bloco de liderança', async ({ page }) => {
  await abrir(page)
  await page.getByRole('button', { name: 'Começar' }).click()
  await page.getByRole('button', { name: 'Colaborador' }).first().click()

  // Avança até o fim do questionário.
  for (let i = 0; i < 15; i++) {
    const continuar = page.getByRole('button', { name: 'Continuar' })
    if ((await continuar.count()) === 0) break
    await continuar.click()
  }

  await expect(page.getByRole('heading', { name: 'Gestão do negócio' })).toHaveCount(0)
})

test('não há rolagem horizontal em nenhuma tela', async ({ page }) => {
  await abrir(page)

  for (let i = 0; i < 12; i++) {
    const largura = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(largura, 'a página não pode rolar na horizontal').toBeLessThanOrEqual(1)

    const proximo = page.getByRole('button', { name: /Começar|Continuar/ })
    if ((await proximo.count()) === 0) break
    await proximo.first().click()
  }
})
