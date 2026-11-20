import { create } from 'zustand'
import { DEFAULT_FILTERS, type Filters } from '../lib/engine'
import type { Dataset } from '../types/data'

export type ViewId = 'panorama' | 'precio' | 'nichos' | 'retencion'
export const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'panorama', label: 'Panorama' },
  { id: 'precio', label: 'Precio y modelo' },
  { id: 'nichos', label: 'Nichos' },
  { id: 'retencion', label: 'Retención' },
]

interface State {
  filters: Filters
  view: ViewId
  conceptOpen: boolean
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  toggleIn: (key: 'genres' | 'tags' | 'models' | 'bands', value: number) => void
  reset: () => void
  setView: (v: ViewId) => void
  setConceptOpen: (open: boolean) => void
  hydrate: (f: Filters, v: ViewId) => void
}

export const useFilters = create<State>((set) => ({
  filters: DEFAULT_FILTERS,
  view: 'panorama',
  conceptOpen: false,
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  toggleIn: (key, value) =>
    set((s) => {
      const cur = s.filters[key]
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      return { filters: { ...s.filters, [key]: next } }
    }),
  reset: () => set({ filters: DEFAULT_FILTERS }),
  setView: (view) => set({ view }),
  setConceptOpen: (conceptOpen) => set({ conceptOpen }),
  hydrate: (filters, view) => set({ filters, view }),
}))

// --- Sincronización con la URL (nombres legibles, no índices) ----------------------------

const SEP = '|'

export function filtersToSearch(ds: Dataset, f: Filters, view: ViewId): string {
  const p = new URLSearchParams()
  if (view !== 'panorama') p.set('vista', view)
  if (f.genres.length) p.set('genero', f.genres.map((i) => ds.genres[i]).join(SEP))
  if (f.tags.length) p.set('tags', f.tags.map((i) => ds.tags[i]).join(SEP))
  if (f.models.length) p.set('modelo', f.models.map((i) => ds.models[i]).join(SEP))
  if (f.bands.length) p.set('precio', f.bands.map((i) => ds.bands[i]).join(SEP))
  const [y0, y1] = DEFAULT_FILTERS.years
  if (f.years[0] !== y0 || f.years[1] !== y1) p.set('anios', `${f.years[0]}-${f.years[1]}`)
  if (f.indie !== 'all') p.set('indie', f.indie)
  if (f.minReviews !== DEFAULT_FILTERS.minReviews) p.set('resenas', String(f.minReviews))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function searchToFilters(ds: Dataset, search: string): { filters: Filters; view: ViewId } {
  const p = new URLSearchParams(search)
  const names = (key: string, dict: readonly string[]) =>
    (p.get(key)?.split(SEP) ?? []).map((n) => dict.indexOf(n)).filter((i) => i >= 0)
  const years = p.get('anios')?.split('-').map(Number)
  const view = (p.get('vista') as ViewId) ?? 'panorama'
  const indie = p.get('indie')
  const minReviews = Number(p.get('resenas'))
  return {
    view: VIEWS.some((v) => v.id === view) ? view : 'panorama',
    filters: {
      genres: names('genero', ds.genres),
      tags: names('tags', ds.tags),
      models: names('modelo', ds.models),
      bands: names('precio', ds.bands),
      years: years?.length === 2 && years.every(Number.isFinite) ? [years[0], years[1]] : DEFAULT_FILTERS.years,
      indie: indie === 'indie' || indie === 'noindie' ? indie : 'all',
      minReviews: [10, 100, 1000].includes(minReviews) ? minReviews : DEFAULT_FILTERS.minReviews,
    },
  }
}
