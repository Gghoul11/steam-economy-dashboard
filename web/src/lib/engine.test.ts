import { describe, expect, it } from 'vitest'
import type { GamesFile, MetaFile } from '../types/data'
import { toDataset } from './dataSource'
import { byBand, conceptBenchmark, DEFAULT_FILTERS, filterIndices, summarize, tagStats } from './engine'
import { median, percentileOf, quantiles, wilsonLowerBound } from './stats'

describe('stats', () => {
  it('median ignora NaN e interpola como percentile_cont', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(median([5, Number.NaN, 1])).toBe(3)
    expect(Number.isNaN(median([]))).toBe(true)
  })
  it('quantiles', () => {
    expect(quantiles([0, 10, 20, 30, 40], [0.25, 0.5, 0.75])).toEqual([10, 20, 30])
  })
  it('percentileOf cuenta valores ≤ x', () => {
    expect(percentileOf(Float64Array.from([1, 2, 3, 4]), 2)).toBe(50)
  })
  it('Wilson coincide con el ETL (900/1000 → ≈ 88,0)', () => {
    expect(wilsonLowerBound(900, 1000)).toBeCloseTo(88.01, 1)
    expect(wilsonLowerBound(5, 5)).toBeLessThan(60) // poca muestra se penaliza
  })
})

const meta: MetaFile = {
  snapshotDate: '2025-12-25', rawRows: 4, universeRows: 4, exclusions: {}, minReviews: 10,
  priceOutlierUsd: 80, trendYears: [2023, 2024, 2025], launchesAllGames: [10, 20, 30],
  tagLaunchesByYear: { Roguelike: [1, 2, 3] },
}
const file: GamesFile = {
  snapshotDate: '2025-12-25',
  genres: ['Action', 'Indie', 'RPG'],
  tags: ['Roguelike', 'Cozy'],
  models: ['Pago', 'F2P', 'Gratis'],
  bands: ['<$5', '$5–9.99', '$10–19.99', '$20–39.99', '$40–79.99'],
  columns: {
    id: [1, 2, 3, 4], name: ['A', 'B', 'C', 'D'], year: [2023, 2024, 2024, 2025], month: [1, 2, 3, 4],
    price: [4.99, 14.99, 0, 99.99], model: [0, 0, 1, 0], band: [0, 2, -1, -1],
    wilson: [60, 80, 70, 50], reviews: [20, 2000, 500, 15], playtime: [2, 10, null, 1],
    ccu: [null, 300, 50, null], indie: [1, 1, 0, 0], dlc: [0, 1, 0, 0], mature: [1, 1, 1, 0],
    priceOutlier: [0, 0, 0, 1], playtimeOutlier: [0, 0, 0, 0],
    genres: [[0, 1], [1, 2], [0], [2]], tags: [[0], [0, 1], [], [1]], primaryGenre: [0, 2, 0, 2],
  },
}
const ds = toDataset(file, meta)

describe('engine', () => {
  it('filtra por reseñas mínimas, modelo y tags (Y lógico)', () => {
    expect(filterIndices(ds, { ...DEFAULT_FILTERS, minReviews: 100 }).length).toBe(2)
    expect([...filterIndices(ds, { ...DEFAULT_FILTERS, models: [1] })]).toEqual([2])
    expect([...filterIndices(ds, { ...DEFAULT_FILTERS, tags: [0, 1] })]).toEqual([1])
    expect([...filterIndices(ds, { ...DEFAULT_FILTERS, genres: [0, 2] })]).toEqual([0, 1, 2, 3])
  })
  it('el precio mediano excluye F2P y atípicos', () => {
    const s = summarize(ds, filterIndices(ds, DEFAULT_FILTERS))
    expect(s.medianPrice).toBeCloseTo((4.99 + 14.99) / 2)
    expect(s.nPrice).toBe(2)
    expect(s.f2pShare).toBe(0.25)
    expect(s.nPlaytime).toBe(3) // null = sin dato
  })
  it('bandas solo con juegos de pago', () => {
    const b = byBand(ds, filterIndices(ds, DEFAULT_FILTERS))
    expect(b.map((x) => x.n)).toEqual([1, 0, 1, 0, 0])
  })
  it('tagStats respeta el mínimo de títulos', () => {
    expect(tagStats(ds, filterIndices(ds, DEFAULT_FILTERS), 2).map((t) => t.label).sort()).toEqual(['Cozy', 'Roguelike'])
  })
  it('conceptBenchmark calcula el percentil del precio', () => {
    const r = conceptBenchmark(ds, { genre: 1, tags: [], price: 10 })
    expect(r.n).toBe(2)
    expect(r.pricePercentile).toBe(50)
  })
})
