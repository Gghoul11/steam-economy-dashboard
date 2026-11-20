/** Formato columnar que produce etl/snapshot.py (web/public/data/games.json). */
export interface GamesFile {
  snapshotDate: string
  genres: string[]
  tags: string[]
  models: BusinessModel[]
  bands: string[]
  columns: {
    id: number[]
    name: string[]
    year: number[]
    month: number[]
    price: number[]
    model: number[]
    band: number[]
    wilson: number[]
    reviews: number[]
    playtime: (number | null)[]
    ccu: (number | null)[]
    indie: number[]
    dlc: number[]
    mature: number[]
    priceOutlier: number[]
    playtimeOutlier: number[]
    genres: number[][]
    tags: number[][]
    primaryGenre: number[]
  }
}

export interface MetaFile {
  snapshotDate: string
  rawRows: number
  universeRows: number
  exclusions: Record<string, number>
  minReviews: number
  priceOutlierUsd: number
  trendYears: number[]
  launchesAllGames: number[]
  tagLaunchesByYear: Record<string, number[]>
}

export type BusinessModel = 'Pago' | 'F2P' | 'Gratis'

/** Dataset en memoria: columnas tipadas para filtrar 56 k filas en pocos milisegundos. */
export interface Dataset {
  size: number
  snapshotDate: string
  genres: string[]
  tags: string[]
  models: BusinessModel[]
  bands: string[]
  id: Int32Array
  name: string[]
  year: Int16Array
  month: Int8Array
  price: Float32Array
  model: Int8Array
  band: Int8Array
  wilson: Float32Array
  reviews: Int32Array
  /** NaN = sin dato de SteamSpy */
  playtime: Float32Array
  /** NaN = sin dato de SteamSpy */
  ccu: Float64Array
  indie: Uint8Array
  dlc: Uint8Array
  mature: Uint8Array
  priceOutlier: Uint8Array
  playtimeOutlier: Uint8Array
  genreSets: Uint16Array[]
  tagSets: Uint16Array[]
  primaryGenre: Int16Array
  meta: MetaFile
}
