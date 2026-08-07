import { defineConfig, devices } from '@playwright/test'

/**
 * E2E do caminho crítico: o formulário do respondente.
 *
 * Precisa de um ambiente de verdade — banco criado, edge functions publicadas
 * e uma rodada aberta com um convite. Um e2e contra mock não provaria nada
 * aqui: o que está sendo testado é justamente a ida e volta ao servidor.
 *
 *   E2E_BASE_URL=http://localhost:4173 \
 *   E2E_TOKEN=<token de um convite de rodada aberta> \
 *   npm run e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173',
    trace: 'retain-on-failure',
    // Ambientes com Chromium pré-instalado em local não padrão (sem os
    // browsers baixados pelo Playwright) apontam aqui em vez de reinstalar.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
    // O navegador do Playwright NÃO herda HTTPS_PROXY do processo — precisa
    // ser configurado explicitamente. Sem isto, atrás de um proxy de saída
    // obrigatório o app fica preso em "Carregando…" para sempre: o baseURL
    // (local) abre normal, mas a chamada às edge functions do Supabase nunca
    // sai.
    proxy: process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' }
      : undefined,
    // Proxies corporativos costumam interceptar TLS com CA própria; sem isto
    // o Chromium rejeita o certificado mesmo com o túnel funcionando.
    ignoreHTTPSErrors: !!process.env.HTTPS_PROXY,
  },

  projects: [
    {
      name: 'celular',
      // Mobile-first não é preferência: a maioria vai responder no telefone,
      // e é onde a Likert empilhada e o alvo de 44px precisam funcionar.
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
