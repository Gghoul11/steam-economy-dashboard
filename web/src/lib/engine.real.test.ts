/** Criterio de aceptación (Fase 2 §7): los KPIs del universo completo coinciden con las referencias. */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { toDataset } from './dataSource'
import { byBand, conceptBenchmark, DEFAULT_FILTERS, filterIndices, playtimeByModel, summarize } from './engine'

const dir = resolve(__dirname, '../../public/data')
const available = existsSync(resolve(dir, 'games.json'))

describe.skipIf(!available)('KPIs con datos reales', () => {
  const ds = available
    ? toDataset(JSON.parse(readFileSync(resolve(dir, 'games.json'), 'utf8')), JSON.parse(readFileSync(resolve(dir, 'meta.json'), 'utf8')))
    : null!
  const all = filterIndices(ds, { ...DEFAULT_FILTERS, years: [0, 9999] })

  it('cabecera de KPIs del universo (K1–K5)', () => {
    const s = summarize(ds, all)
    expect(s.n).toBe(55918)
    expect(s.medianPrice).toBeCloseTo(5.99, 2)
    expect(s.medianWilson).toBeGreaterThan(68.9 * 0.995)
    expect(s.medianWilson).toBeLessThan(68.9 * 1.005)
    expect(s.f2pShare).toBeCloseTo(0.0877, 3)
  })
  it('K6: Wilson por banda crece hasta $20–39.99', () => {
    const w = byBand(ds, all).map((b) => b.medianWilson)
    expect(w[0]).toBeCloseTo(65.4, 0)
    expect(w[3]).toBeGreaterThan(w[0])
  })
  it('K10: F2P retiene menos horas medianas que Pago', () => {
    const [pago, f2p] = playtimeByModel(ds, all)
    expect(pago.p50).toBeGreaterThan(f2p.p50)
  })
  it('K15 local = rpc_concept_benchmark en PostgreSQL (RPG + Roguelike, $14.99)', () => {
    // Valores devueltos por Supabase el 2026-11-20 (n=1433, percentil 82,1, mediana $8,99, Wilson 72,2)
    const r = conceptBenchmark(ds, { genre: ds.genres.indexOf('RPG'), tags: [ds.tags.indexOf('Roguelike')], price: 14.99 })
    expect(r.n).toBe(1433)
    expect(r.pricePercentile).toBeCloseTo(82.1, 1)
    expect(r.p50).toBeCloseTo(8.99, 2)
    expect(r.medianWilson).toBeCloseTo(72.2, 0)
    expect(r.bestBand).toBe('$20–39.99')
  })
  it('filtrar 56 k filas tarda < 50 ms', () => {
    const t0 = performance.now()
    filterIndices(ds, { ...DEFAULT_FILTERS, genres: [ds.genres.indexOf('RPG')], tags: [0], minReviews: 100 })
    expect(performance.now() - t0).toBeLessThan(50)
  })
})
