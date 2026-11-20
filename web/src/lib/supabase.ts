/** Consultas en vivo a PostgreSQL (Supabase) con la clave pública: solo lectura, protegida por RLS. */
import type { SupabaseClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabaseEnabled = Boolean(URL && KEY)

let client: Promise<SupabaseClient> | null = null
function getClient(): Promise<SupabaseClient> {
  if (!supabaseEnabled) return Promise.reject(new Error('Supabase no configurado'))
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL!, KEY!, { auth: { persistSession: false } }),
  )
  return client
}

export interface RemoteHealth {
  games: number
  universe: number
}

export async function fetchHealth(): Promise<RemoteHealth> {
  const sb = await getClient()
  const { data, error } = await sb.rpc('rpc_health').single<RemoteHealth>()
  if (error) throw error
  return data
}

export interface ConceptResult {
  n: number
  pricePercentile: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  medianWilson: number
  medianPlaytime: number
  bestBand: string | null
}

const num = (v: unknown) => (v == null ? Number.NaN : Number(v))

/** K15 en el servidor: rpc_concept_benchmark (database/migrations/004_rpc.sql). */
export async function fetchConcept(genre: string | null, tags: string[], price: number | null): Promise<ConceptResult> {
  const sb = await getClient()
  const { data, error } = await sb
    .rpc('rpc_concept_benchmark', { p_genre: genre, p_tags: tags, p_price: price })
    .single<Record<string, unknown>>()
  if (error) throw error
  return {
    n: Number(data.n_comparables),
    pricePercentile: num(data.price_percentile),
    p10: num(data.p10),
    p25: num(data.p25),
    p50: num(data.p50),
    p75: num(data.p75),
    p90: num(data.p90),
    medianWilson: num(data.median_wilson),
    medianPlaytime: num(data.median_playtime_h),
    bestBand: (data.best_band as string | null) ?? null,
  }
}
