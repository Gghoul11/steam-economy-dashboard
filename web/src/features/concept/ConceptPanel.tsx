import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { MultiSelect } from '../../components/ui/controls'
import { conceptBenchmark, thematicGenres } from '../../lib/engine'
import { fetchConcept, supabaseEnabled } from '../../lib/supabase'
import { fmtDec, fmtHours, fmtInt, fmtUsd } from '../../lib/format'
import { useFilters } from '../../store/filters'
import type { Dataset } from '../../types/data'

/** K15 · "Evalúa tu concepto": posición de precio frente a juegos comparables. */
export function ConceptPanel({ ds }: { ds: Dataset }) {
  const { conceptOpen, setConceptOpen, hydrate, filters } = useFilters()
  const genreOptions = useMemo(() => thematicGenres(ds).map((i) => ({ value: i, label: ds.genres[i] })), [ds])
  const [genre, setGenre] = useState<number | null>(genreOptions[0]?.value ?? null)
  const [tags, setTags] = useState<number[]>([])
  const [price, setPrice] = useState('14.99')

  useEffect(() => {
    if (!conceptOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConceptOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [conceptOpen, setConceptOpen])

  const p = Number.parseFloat(price)
  const local = useMemo(
    () => conceptBenchmark(ds, { genre, tags, price: Number.isFinite(p) ? p : null }),
    [ds, genre, tags, p],
  )

  // Consulta en vivo a PostgreSQL; el cálculo local responde mientras tanto o si Supabase falla
  const [query, setQuery] = useState({ genre, tags, p })
  useEffect(() => {
    const id = setTimeout(() => setQuery({ genre, tags, p }), 400)
    return () => clearTimeout(id)
  }, [genre, tags, p])
  const remote = useQuery({
    queryKey: ['concept', query.genre, query.tags, query.p],
    queryFn: () => fetchConcept(
      query.genre != null ? ds.genres[query.genre] : null,
      query.tags.map((tg) => ds.tags[tg]),
      Number.isFinite(query.p) ? query.p : null,
    ),
    enabled: supabaseEnabled && conceptOpen,
    staleTime: Infinity,
    retry: 0,
  })
  const settled = query.genre === genre && query.tags === tags && Object.is(query.p, p)
  const live = remote.isSuccess && settled && !remote.isFetching
  const r = live ? remote.data : local
  const status = !supabaseEnabled
    ? 'Cálculo local'
    : live ? 'En vivo · PostgreSQL (Supabase)'
    : remote.isError ? 'Cálculo local (Supabase no disponible)'
    : 'Consultando PostgreSQL…'
  if (!conceptOpen) return null

  const scale = (v: number) => `${Math.min(100, Math.max(0, (v / Math.max(r.p90 * 1.15, p || 0, 1)) * 100))}%`
  const apply = () => {
    hydrate({ ...filters, genres: genre != null ? [genre] : [], tags, models: [0] }, 'precio')
    setConceptOpen(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={() => setConceptOpen(false)}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="concept-title"
        className="flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto bg-surface p-5 shadow-2xl"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <h2 id="concept-title" className="text-lg font-semibold text-ink">Evalúa tu concepto</h2>
          <button type="button" onClick={() => setConceptOpen(false)} className="rounded-md px-2 py-1 text-ink-2 hover:bg-surface-2" aria-label="Cerrar">✕</button>
        </header>
        <p className="text-sm text-ink-2">Describe tu juego y compáralo con títulos de pago similares (mismo género y todos los tags elegidos).</p>

        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Género
          <select className="h-9 rounded-lg border border-line bg-page px-2 text-ink" value={genre ?? ''} onChange={(e) => setGenre(e.target.value === '' ? null : +e.target.value)}>
            <option value="">Cualquiera</option>
            {genreOptions.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </label>
        <div className="flex flex-col gap-1 text-sm text-ink-2">
          Tags
          <div className="flex flex-wrap items-center gap-1.5">
            <MultiSelect label="Elegir tags" options={ds.tags.map((label, value) => ({ value, label }))} selected={tags}
              onToggle={(v) => setTags((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))} searchable />
            {tags.map((tg) => (
              <button key={tg} type="button" onClick={() => setTags((c) => c.filter((x) => x !== tg))} className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-ink">
                {ds.tags[tg]} ✕
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Precio de lista previsto (USD)
          <input type="number" min="0.99" step="1" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)}
            className="h-9 rounded-lg border border-line bg-page px-2 text-ink" />
        </label>

        <div className="rounded-xl border border-line bg-page p-4" aria-live="polite">
          <p className="mb-2 flex items-center gap-1.5 text-xs text-muted">
            <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${live ? 'bg-[var(--series-gratis)]' : 'bg-[var(--deemph)]'}`} />
            {status}
          </p>
          <p className="text-sm text-ink-2">Juegos comparables</p>
          <p className="text-3xl font-semibold text-ink">{fmtInt(r.n)}</p>
          {r.n < 30 ? (
            <p className="mt-2 text-sm text-ink-2"><span aria-hidden>⚠</span> Menos de 30 comparables: quita algún tag para obtener una referencia fiable.</p>
          ) : (
            <>
              <p className="mt-3 text-sm text-ink">
                Tu precio queda en el <b>percentil {fmtInt(r.pricePercentile)}</b> de su segmento.
              </p>
              <div className="relative mt-3 h-8" aria-hidden>
                <div className="absolute top-1/2 h-px w-full bg-[var(--axis)]" />
                <div className="absolute top-1/2 h-px bg-[var(--ink-2)]" style={{ left: scale(r.p10), width: `calc(${scale(r.p90)} - ${scale(r.p10)})` }} />
                <div className="absolute top-1 h-6 rounded border border-accent bg-accent/20" style={{ left: scale(r.p25), width: `calc(${scale(r.p75)} - ${scale(r.p25)})` }} />
                <div className="absolute top-1 h-6 w-0.5 bg-accent" style={{ left: scale(r.p50) }} />
                {Number.isFinite(p) && <div className="absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[var(--surface)] bg-[var(--series-f2p)]" style={{ left: scale(p) }} />}
              </div>
              <p className="text-xs text-muted">Caja P25–P75 ({fmtUsd(r.p25)}–{fmtUsd(r.p75)}), mediana {fmtUsd(r.p50)}, línea P10–P90 · punto naranja: tu precio</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <dt className="text-ink-2">Wilson mediano</dt><dd className="text-right font-medium text-ink">{fmtDec(r.medianWilson)}</dd>
                <dt className="text-ink-2">Horas medianas</dt><dd className="text-right font-medium text-ink">{fmtHours(r.medianPlaytime)}</dd>
                <dt className="text-ink-2">Banda mejor valorada</dt><dd className="text-right font-medium text-ink">{r.bestBand ?? '—'}</dd>
              </dl>
            </>
          )}
        </div>
        <button type="button" onClick={apply} className="h-10 rounded-lg bg-accent text-sm font-medium text-white hover:opacity-90">
          Aplicar como filtro global
        </button>
        <p className="text-xs text-muted">Referencia descriptiva basada en el catálogo histórico; no es una predicción de ventas.</p>
      </aside>
    </div>
  )
}
