/** Percentil con interpolación lineal (equivalente a percentile_cont de PostgreSQL). */
export function quantileSorted(sorted: ArrayLike<number>, q: number): number {
  const n = sorted.length
  if (n === 0) return Number.NaN
  const pos = (n - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.min(lo + 1, n - 1)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

/** Copia y ordena descartando NaN. */
export function sortedFinite(values: Iterable<number>): Float64Array {
  const out: number[] = []
  for (const v of values) if (!Number.isNaN(v)) out.push(v)
  return Float64Array.from(out).sort()
}

export function median(values: Iterable<number>): number {
  return quantileSorted(sortedFinite(values), 0.5)
}

export function quantiles(values: Iterable<number>, qs: number[]): number[] {
  const s = sortedFinite(values)
  return qs.map((q) => quantileSorted(s, q))
}

/** Proporción de valores ≤ x (posición percentil, 0–100). */
export function percentileOf(sorted: ArrayLike<number>, x: number): number {
  if (sorted.length === 0) return Number.NaN
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] <= x) lo = mid + 1
    else hi = mid
  }
  return (100 * lo) / sorted.length
}

/** Límite inferior de Wilson al 95 % (0–100); igual que en el ETL. */
export function wilsonLowerBound(positive: number, total: number, z = 1.96): number {
  if (total === 0) return 0
  const p = positive / total
  const z2 = z * z
  return (100 * (p + z2 / (2 * total) - z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total))) / (1 + z2 / total)
}
