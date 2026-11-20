import type { Dataset, GamesFile, MetaFile } from '../types/data'

const nanIfNull = (v: number | null) => (v == null ? Number.NaN : v)

export function toDataset(file: GamesFile, meta: MetaFile): Dataset {
  const c = file.columns
  return {
    size: c.id.length,
    snapshotDate: file.snapshotDate,
    genres: file.genres,
    tags: file.tags,
    models: file.models,
    bands: file.bands,
    id: Int32Array.from(c.id),
    name: c.name,
    year: Int16Array.from(c.year),
    month: Int8Array.from(c.month),
    price: Float32Array.from(c.price),
    model: Int8Array.from(c.model),
    band: Int8Array.from(c.band),
    wilson: Float32Array.from(c.wilson),
    reviews: Int32Array.from(c.reviews),
    playtime: Float32Array.from(c.playtime, nanIfNull),
    ccu: Float64Array.from(c.ccu, nanIfNull),
    indie: Uint8Array.from(c.indie),
    dlc: Uint8Array.from(c.dlc),
    mature: Uint8Array.from(c.mature),
    priceOutlier: Uint8Array.from(c.priceOutlier),
    playtimeOutlier: Uint8Array.from(c.playtimeOutlier),
    genreSets: c.genres.map((g) => Uint16Array.from(g)),
    tagSets: c.tags.map((t) => Uint16Array.from(t)),
    primaryGenre: Int16Array.from(c.primaryGenre),
    meta,
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!res.ok) throw new Error(`No se pudo cargar ${path} (${res.status})`)
  return res.json() as Promise<T>
}

/**
 * Arquitectura híbrida (Fase 4): los gráficos se calculan sobre el snapshot que genera el ETL,
 * servido por el CDN junto con la app. Supabase atiende las consultas en vivo (ver supabase.ts):
 * descargar 56 k filas por la API REST del plan gratuito supera su límite de 3 s por consulta.
 */
export async function loadDataset(): Promise<Dataset> {
  const [games, meta] = await Promise.all([
    fetchJson<GamesFile>('data/games.json'),
    fetchJson<MetaFile>('data/meta.json'),
  ])
  return toDataset(games, meta)
}
