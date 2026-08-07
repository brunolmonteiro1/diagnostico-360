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
