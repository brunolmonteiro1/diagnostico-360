/**
 * Classificação visual de uma maturidade (0–100) numa das três cores do
 * semáforo de diagnóstico. Limiares são decisão de exibição, não regra de
 * cálculo — registrados em docs/ARQUITETURA.md — e só se aplicam quando o
 * recorte já é `confiavel` (nunca chamado para um nulo).
 */
export type FaixaSaude = 'critico' | 'atencao' | 'saudavel'

export function faixaDeSaude(maturidade: number): FaixaSaude {
  if (maturidade < 40) return 'critico'
  if (maturidade < 70) return 'atencao'
  return 'saudavel'
}

export const COR_FAIXA: Record<FaixaSaude, string> = {
  critico: 'var(--critico)',
  atencao: 'var(--atencao)',
  saudavel: 'var(--saudavel)',
}

export const COR_SEM_DADO = 'var(--sem-dado)'

export const ROTULO_DIMENSAO: Record<string, string> = {
  comunicacao: 'Comunicação',
  ferramentas: 'Ferramentas',
  lideranca: 'Liderança',
  papeis: 'Papéis',
  pessoas: 'Pessoas',
  processos: 'Processos',
}

export function rotuloDimensao(dimensao: string): string {
  return ROTULO_DIMENSAO[dimensao] ?? dimensao
}
