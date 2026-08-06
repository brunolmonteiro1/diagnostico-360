#!/usr/bin/env node
/**
 * Aplica o shim de auth e as migrations reais num banco limpo e roda os testes
 * de SQL de tests/db/.
 *
 * Usa o psql do sistema de propósito: as regras testadas aqui são do Postgres
 * (RLS, GRANT, CHECK), e um cliente Node no meio só acrescentaria dependência e
 * uma camada a mais entre o teste e o que ele afirma.
 *
 * Precisa de TEST_DATABASE_URL apontando para um Postgres descartável — o banco
 * é recriado do zero a cada execução. Sem a variável, sai com código 2 e os
 * testes que dependem dele são pulados.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const url = process.env.TEST_DATABASE_URL

if (!url) {
  console.error(
    'TEST_DATABASE_URL não definida. Exemplo:\n' +
      '  TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5433/postgres npm run test:db'
  )
  process.exit(2)
}

const admin = new URL(url)
const bancoDeTeste = (admin.pathname.replace('/', '') || 'postgres') + '_rls_test'
const urlAdmin = new URL(admin)
urlAdmin.pathname = '/postgres'
const urlTeste = new URL(admin)
urlTeste.pathname = `/${bancoDeTeste}`

function psql(conexao, args) {
  return execFileSync(
    'psql',
    [conexao.toString(), '-v', 'ON_ERROR_STOP=1', '--no-psqlrc', '-q', ...args],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  )
}

function arquivosSql(pasta) {
  return readdirSync(join(raiz, pasta))
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => join(raiz, pasta, f))
}

try {
  // Banco descartável: o teste nunca deve depender de estado de execução anterior.
  psql(urlAdmin, [
    '-c',
    `drop database if exists ${bancoDeTeste} with (force)`,
    '-c',
    `create database ${bancoDeTeste}`,
  ])

  const shim = join(raiz, 'tests/db/00-auth-shim.sql')
  const migrations = arquivosSql('supabase/migrations')
  const testes = arquivosSql('tests/db').filter((f) => f !== shim)

  if (migrations.length === 0) throw new Error('nenhuma migration encontrada')

  for (const arquivo of [shim, ...migrations, ...testes]) {
    const saida = psql(urlTeste, ['-f', arquivo])
    const rotulo = arquivo.replace(`${raiz}/`, '')
    process.stdout.write(`  ok  ${rotulo}\n`)
    if (saida.trim()) process.stdout.write(`      ${saida.trim()}\n`)
  }

  psql(urlAdmin, ['-c', `drop database if exists ${bancoDeTeste} with (force)`])
  console.log('\nTestes de banco: OK')
} catch (erro) {
  const detalhe = erro.stderr?.toString() || erro.message
  console.error(`\nTestes de banco: FALHOU\n${detalhe}`)
  process.exit(1)
}
