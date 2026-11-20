const nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const usd = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const compact = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 })

const ok = (v: number) => Number.isFinite(v)
export const fmtInt = (v: number) => (ok(v) ? nf0.format(v) : '—')
export const fmtDec = (v: number) => (ok(v) ? nf1.format(v) : '—')
export const fmtUsd = (v: number) => (ok(v) ? usd.format(v) : '—')
export const fmtHours = (v: number) => (ok(v) ? `${nf1.format(v)} h` : '—')
export const fmtPct = (v: number) => (ok(v) ? `${nf1.format(v * 100)} %` : '—')
export const fmtCompact = (v: number) => (ok(v) ? compact.format(v) : '—')

export function fmtDelta(v: number, base: number, kind: 'pts' | 'pct' | 'usd' | 'h'): string {
  if (!ok(v) || !ok(base)) return ''
  const d = v - base
  if (Math.abs(d) < 0.05) return 'igual que Steam'
  const sign = d > 0 ? '+' : '−'
  const a = Math.abs(d)
  const body = kind === 'pts' ? `${nf1.format(a)} pts` : kind === 'pct' ? `${nf1.format(a * 100)} pts` : kind === 'usd' ? usd.format(a) : `${nf1.format(a)} h`
  return `${sign}${body} vs. Steam`
}

export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
