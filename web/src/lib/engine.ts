/**
 * Motor de KPIs en el navegador (Fase 2 §1). Recibe el universo analítico ya limpio y
 * calcula cada indicador sobre el subconjunto filtrado. Fórmulas idénticas a las vistas
 * materializadas de database/migrations/003_views.sql.
 */
import type { Dataset } from '../types/data'
import { median, percentileOf, quantiles, sortedFinite } from './stats'

export type IndieFilter = 'all' | 'indie' | 'noindie'

export interface Filters {
  genres: number[] // OR: el juego tiene alguno
  tags: number[] // AND: el juego tiene todos
  models: number[] // vacío = todos
  bands: number[] // vacío = todas
  years: [number, number]
  indie: IndieFilter
  minReviews: number
}

export const DEFAULT_FILTERS: Filters = {
  genres: [],
  tags: [],
  models: [],
  bands: [],
  years: [2006, 2025],
  indie: 'all',
  minReviews: 10,
}

export const PAGO = 0
export const F2P = 1
const NON_THEMATIC = new Set(['Indie', 'Early Access', 'Free to Play'])

function hasAny(set: Uint16Array, wanted: number[]): boolean {
  for (const w of wanted) if (set.includes(w)) return true
  return false
}
function hasAll(set: Uint16Array, wanted: number[]): boolean {
  for (const w of wanted) if (!set.includes(w)) return false
  return true
}

export function filterIndices(ds: Dataset, f: Filters): Int32Array {
  const out = new Int32Array(ds.size)
  let k = 0
  const [y0, y1] = f.years
  for (let i = 0; i < ds.size; i++) {
    if (ds.reviews[i] < f.minReviews) continue
    if (ds.year[i] < y0 || ds.year[i] > y1) continue
    if (f.models.length && !f.models.includes(ds.model[i])) continue
    if (f.bands.length && !f.bands.includes(ds.band[i])) continue
    if (f.indie === 'indie' && !ds.indie[i]) continue
    if (f.indie === 'noindie' && ds.indie[i]) continue
    if (f.genres.length && !hasAny(ds.genreSets[i], f.genres)) continue
    if (f.tags.length && !hasAll(ds.tagSets[i], f.tags)) continue
    out[k++] = i
  }
  return out.subarray(0, k)
}

const isPaidClean = (ds: Dataset, i: number) => ds.model[i] === PAGO && !ds.priceOutlier[i]

function* pluck(idx: Int32Array, col: ArrayLike<number>, keep?: (i: number) => boolean) {
  for (const i of idx) if (!keep || keep(i)) yield col[i]
}

export interface Summary {
  n: number
  medianPrice: number
  nPrice: number
  medianWilson: number
  medianPlaytime: number
  nPlaytime: number
  f2pShare: number
}

export function summarize(ds: Dataset, idx: Int32Array): Summary {
  const prices = sortedFinite(pluck(idx, ds.price, (i) => isPaidClean(ds, i)))
  const pt = sortedFinite(pluck(idx, ds.playtime))
  let f2p = 0
  for (const i of idx) if (ds.model[i] === F2P) f2p++
  return {
    n: idx.length,
    medianPrice: median(prices),
    nPrice: prices.length,
    medianWilson: median(pluck(idx, ds.wilson)),
    medianPlaytime: median(pt),
    nPlaytime: pt.length,
    f2pShare: idx.length ? f2p / idx.length : Number.NaN,
  }
}

function groupBy(idx: Int32Array, key: (i: number) => number | number[] | Uint16Array, size: number): number[][] {
  const groups: number[][] = Array.from({ length: size }, () => [])
  for (const i of idx) {
    const k = key(i)
    if (typeof k === 'number') {
      if (k >= 0 && k < size) groups[k].push(i)
    } else for (const kk of k) if (kk < size) groups[kk].push(i)
  }
  return groups
}

export interface GroupStat {
  key: number
  label: string
  n: number
  medianWilson: number
  medianPrice: number
  medianPlaytime: number
  nPlaytime: number
  medianCcu: number
  nCcu: number
}

function groupStat(ds: Dataset, key: number, label: string, members: number[]): GroupStat {
  const m = Int32Array.from(members)
  const pt = sortedFinite(pluck(m, ds.playtime))
  const ccu = sortedFinite(pluck(m, ds.ccu))
  return {
    key,
    label,
    n: m.length,
    medianWilson: median(pluck(m, ds.wilson)),
    medianPrice: median(pluck(m, ds.price, (i) => isPaidClean(ds, i))),
    medianPlaytime: median(pt),
    nPlaytime: pt.length,
    medianCcu: median(ccu),
    nCcu: ccu.length,
  }
}

/** K6, K11: recepción, horas y CCU por banda de precio (solo pago sin atípicos). */
export function byBand(ds: Dataset, idx: Int32Array): GroupStat[] {
  const g = groupBy(idx, (i) => (isPaidClean(ds, i) ? ds.band[i] : -1), ds.bands.length)
  return g.map((members, b) => groupStat(ds, b, ds.bands[b], members))
}

/** K10: distribución de horas por modelo de cobro. */
export function playtimeByModel(ds: Dataset, idx: Int32Array) {
  const g = groupBy(idx, (i) => ds.model[i], ds.models.length)
  return g.map((members, m) => {
    const [p10, p25, p50, p75, p90] = quantiles(pluck(Int32Array.from(members), ds.playtime), [0.1, 0.25, 0.5, 0.75, 0.9])
    const n = sortedFinite(pluck(Int32Array.from(members), ds.playtime)).length
    return { model: m, label: ds.models[m], n, p10, p25, p50, p75, p90 }
  })
}

export function thematicGenres(ds: Dataset): number[] {
  return ds.genres.map((_, i) => i).filter((i) => !NON_THEMATIC.has(ds.genres[i]))
}

/** K7: distribución de precio de lista por género (top N por volumen). */
export function priceBoxByGenre(ds: Dataset, idx: Int32Array, topN = 10) {
  const themes = new Set(thematicGenres(ds))
  const g = groupBy(idx, (i) => (isPaidClean(ds, i) ? ds.genreSets[i] : []), ds.genres.length)
  return g
    .map((members, gi) => ({ gi, members }))
    .filter(({ gi, members }) => themes.has(gi) && members.length >= 30)
    .sort((a, b) => b.members.length - a.members.length)
    .slice(0, topN)
    .map(({ gi, members }) => {
      const [p10, p25, p50, p75, p90] = quantiles(pluck(Int32Array.from(members), ds.price), [0.1, 0.25, 0.5, 0.75, 0.9])
      return { genre: gi, label: ds.genres[gi], n: members.length, p10, p25, p50, p75, p90 }
    })
}

/** K13 / K14: brechas con-vs-sin DLC (Wilson) e indie-vs-no indie (precio) por género. */
export function gapsByGenre(ds: Dataset, idx: Int32Array, topN = 8) {
  const themes = new Set(thematicGenres(ds))
  const g = groupBy(idx, (i) => ds.genreSets[i], ds.genres.length)
  return g
    .map((members, gi) => ({ gi, m: Int32Array.from(members) }))
    .filter(({ gi, m }) => themes.has(gi) && m.length >= 60)
    .sort((a, b) => b.m.length - a.m.length)
    .slice(0, topN)
    .map(({ gi, m }) => ({
      genre: gi,
      label: ds.genres[gi],
      wilsonDlc: median(pluck(m, ds.wilson, (i) => ds.dlc[i] === 1)),
      wilsonNoDlc: median(pluck(m, ds.wilson, (i) => ds.dlc[i] === 0)),
      priceIndie: median(pluck(m, ds.price, (i) => ds.indie[i] === 1 && isPaidClean(ds, i))),
      priceNoIndie: median(pluck(m, ds.price, (i) => ds.indie[i] === 0 && isPaidClean(ds, i))),
    }))
}

/** K12: tendencia anual, solo cohortes maduras (≥ 12 meses). */
export function yearly(ds: Dataset, idx: Int32Array) {
  const years = ds.meta.trendYears
  const y0 = years[0]
  const g = groupBy(idx, (i) => (ds.mature[i] ? ds.year[i] - y0 : -1), years.length)
  return g.map((members, k) => {
    const m = Int32Array.from(members)
    return {
      year: years[k],
      n: m.length,
      allLaunches: ds.meta.launchesAllGames[k],
      medianPrice: m.length >= 30 ? median(pluck(m, ds.price, (i) => isPaidClean(ds, i))) : Number.NaN,
      medianWilson: m.length >= 30 ? median(pluck(m, ds.wilson)) : Number.NaN,
    }
  })
}

export interface TagStat extends GroupStat {
  saturationPct: number
  opportunity: number
  launches24m: number
}

/** K8 / K9: estadísticas por tag e índice de oportunidad = Wilson × (1 − percentil de saturación). */
export function tagStats(ds: Dataset, idx: Int32Array, minTitles = 30): TagStat[] {
  const g = groupBy(idx, (i) => ds.tagSets[i], ds.tags.length)
  const base = g
    .map((members, t) => ({ t, members }))
    .filter(({ members }) => members.length >= minTitles)
    .map(({ t, members }) => groupStat(ds, t, ds.tags[t], members))
  const sortedN = Float64Array.from(base.map((b) => b.n)).sort()
  const years = ds.meta.trendYears
  return base.map((b) => {
    const saturationPct = percentileOf(sortedN, b.n) / 100
    const series = ds.meta.tagLaunchesByYear[b.label] ?? []
    return {
      ...b,
      saturationPct,
      opportunity: b.medianWilson * (1 - saturationPct),
      launches24m: (series[years.length - 1] ?? 0) + (series[years.length - 2] ?? 0),
    }
  })
}

/** Puntos para dispersión: [x, y, índice de fila], separados por modelo de cobro. */
export function scatterByModel(ds: Dataset, idx: Int32Array, x: 'price' | 'playtime', paidOnly: boolean) {
  const out: [number, number, number][][] = ds.models.map(() => [])
  for (const i of idx) {
    if (paidOnly && !isPaidClean(ds, i)) continue
    const xv = x === 'price' ? ds.price[i] : ds.playtime[i]
    if (!(xv > 0)) continue
    out[ds.model[i]].push([xv, ds.wilson[i], i])
  }
  return out
}

export function ccuLeaders(ds: Dataset, idx: Int32Array, topN = 12) {
  return [...idx]
    .filter((i) => ds.ccu[i] > 0)
    .sort((a, b) => ds.ccu[b] - ds.ccu[a])
    .slice(0, topN)
    .map((i) => ({ i, name: ds.name[i], ccu: ds.ccu[i], model: ds.model[i] }))
}

/** Estacionalidad: lanzamientos y Wilson mediano por mes (cohortes 2018+ maduras). */
export function byMonth(ds: Dataset, idx: Int32Array) {
  const g = groupBy(idx, (i) => (ds.mature[i] && ds.year[i] >= 2018 ? ds.month[i] - 1 : -1), 12)
  return g.map((members, m) => ({
    month: m,
    n: members.length,
    medianWilson: median(pluck(Int32Array.from(members), ds.wilson)),
  }))
}

export interface ConceptInput {
  genre: number | null
  tags: number[]
  price: number | null
}

/** K15: posición de un concepto frente a juegos comparables (pago, sin atípicos). */
export function conceptBenchmark(ds: Dataset, input: ConceptInput) {
  const comp: number[] = []
  for (let i = 0; i < ds.size; i++) {
    if (!isPaidClean(ds, i)) continue
    if (input.genre != null && !ds.genreSets[i].includes(input.genre)) continue
    if (input.tags.length && !hasAll(ds.tagSets[i], input.tags)) continue
    comp.push(i)
  }
  const m = Int32Array.from(comp)
  const prices = sortedFinite(pluck(m, ds.price))
  const [p10, p25, p50, p75, p90] = quantiles(prices, [0.1, 0.25, 0.5, 0.75, 0.9])
  const bands = byBand(ds, m).filter((b) => b.n >= 30)
  const best = bands.sort((a, b) => b.medianWilson - a.medianWilson)[0]
  return {
    n: m.length,
    pricePercentile: input.price != null ? percentileOf(prices, input.price) : Number.NaN,
    p10, p25, p50, p75, p90,
    medianWilson: median(pluck(m, ds.wilson)),
    medianPlaytime: median(pluck(m, ds.playtime)),
    bestBand: best?.label ?? null,
  }
}
