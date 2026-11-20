import type { Dataset } from '../types/data'
import { useFilters } from '../store/filters'
import { MultiSelect, Segmented, YearRange } from './ui/controls'
import { DEFAULT_FILTERS, type IndieFilter } from '../lib/engine'

/** Barra de filtros global: una sola fila sobre todas las vistas (Fase 2 §2). */
export function FilterBar({ ds }: { ds: Dataset }) {
  const { filters: f, toggleIn, setFilter, reset } = useFilters()
  const opts = (list: string[]) => list.map((label, value) => ({ value, label }))
  const chips = [
    ...f.genres.map((i) => ({ key: 'genres' as const, i, label: ds.genres[i] })),
    ...f.tags.map((i) => ({ key: 'tags' as const, i, label: `#${ds.tags[i]}` })),
    ...f.models.map((i) => ({ key: 'models' as const, i, label: ds.models[i] })),
    ...f.bands.map((i) => ({ key: 'bands' as const, i, label: ds.bands[i] })),
  ]
  const dirty = JSON.stringify(f) !== JSON.stringify(DEFAULT_FILTERS)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <MultiSelect label="Género" options={opts(ds.genres)} selected={f.genres} onToggle={(v) => toggleIn('genres', v)} />
        <MultiSelect label="Tags" options={opts(ds.tags)} selected={f.tags} onToggle={(v) => toggleIn('tags', v)} searchable />
        <MultiSelect label="Modelo" options={opts(ds.models)} selected={f.models} onToggle={(v) => toggleIn('models', v)} />
        <MultiSelect label="Banda de precio" options={opts(ds.bands)} selected={f.bands} onToggle={(v) => toggleIn('bands', v)} />
        <YearRange years={ds.meta.trendYears} value={f.years} onChange={(v) => setFilter('years', v)} />
        <Segmented<IndieFilter>
          label="Indie"
          value={f.indie}
          onChange={(v) => setFilter('indie', v)}
          options={[{ value: 'all', label: 'Todos' }, { value: 'indie', label: 'Indie' }, { value: 'noindie', label: 'No indie' }]}
        />
        <Segmented<number>
          label="Mínimo de reseñas"
          value={f.minReviews}
          onChange={(v) => setFilter('minReviews', v)}
          options={[{ value: 10, label: '≥10' }, { value: 100, label: '≥100' }, { value: 1000, label: '≥1k' }]}
        />
      </div>
      {(chips.length > 0 || dirty) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted">Filtros activos:</span>
          {chips.map((c) => (
            <button
              key={`${c.key}-${c.i}`}
              type="button"
              onClick={() => toggleIn(c.key, c.i)}
              className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-ink hover:border-accent"
              aria-label={`Quitar filtro ${c.label}`}
            >
              {c.label} <span aria-hidden>✕</span>
            </button>
          ))}
          <button type="button" onClick={reset} className="ml-1 text-accent underline-offset-2 hover:underline">
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  )
}
