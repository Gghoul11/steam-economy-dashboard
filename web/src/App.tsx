import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useEffect, useMemo, useRef } from 'react'
import { FilterBar } from './components/FilterBar'
import { ConceptPanel } from './features/concept/ConceptPanel'
import { NichesView } from './features/niches/NichesView'
import { OverviewView } from './features/overview/OverviewView'
import { PricingView } from './features/pricing/PricingView'
import { RetentionView } from './features/retention/RetentionView'
import { DEFAULT_FILTERS, filterIndices } from './lib/engine'
import { loadDataset } from './lib/dataSource'
import { fetchHealth, supabaseEnabled } from './lib/supabase'
import { fmtInt } from './lib/format'
import { chartTokens, setTheme, useTheme } from './lib/theme'
import { filtersToSearch, searchToFilters, useFilters, VIEWS } from './store/filters'
import type { Dataset } from './types/data'

export default function App() {
  const { data, error, isPending } = useQuery({ queryKey: ['dataset'], queryFn: loadDataset, staleTime: Infinity })

  if (isPending) {
    return <div className="grid min-h-screen place-items-center text-sm text-ink-2">Cargando 55 918 juegos de Steam…</div>
  }
  if (error || !data) {
    return <div className="grid min-h-screen place-items-center p-6 text-sm text-ink">No se pudieron cargar los datos: {String(error)}</div>
  }
  return <Dashboard ds={data} />
}

function Dashboard({ ds }: { ds: Dataset }) {
  const { filters, view, setView, setConceptOpen, hydrate } = useFilters()
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth, enabled: supabaseEnabled, retry: 1, staleTime: Infinity })
  const dbStatus = !supabaseEnabled
    ? 'sin conexión configurada'
    : health.isSuccess ? `conectado (${fmtInt(health.data.games)} registros)`
    : health.isError ? 'no disponible, se usa cálculo local'
    : 'conectando…'
  const theme = useTheme()
  const hydrated = useRef(false)

  // Estado → URL en cada cambio. Va antes de la hidratación para no sobrescribir la URL
  // inicial con los filtros por defecto en el primer render.
  useEffect(() => {
    if (!hydrated.current) return
    const url = `${window.location.pathname}${filtersToSearch(ds, filters, view)}`
    window.history.replaceState(null, '', url)
  }, [ds, filters, view])
  // URL → estado (una sola vez, al cargar el dataset)
  useEffect(() => {
    const s = searchToFilters(ds, window.location.search)
    hydrate(s.filters, s.view)
    hydrated.current = true
  }, [ds, hydrate])

  // Mantener la vista anterior mientras se recalcula (sin parpadeos)
  const deferred = useDeferredValue(filters)
  const stale = deferred !== filters
  const idx = useMemo(() => filterIndices(ds, deferred), [ds, deferred])
  const all = useMemo(() => filterIndices(ds, { ...DEFAULT_FILTERS, years: [0, 9999] }), [ds])
  // chartTokens() lee las variables CSS del tema activo; `theme` fuerza el recálculo
  const t = useMemo(() => (theme ? chartTokens() : chartTokens()), [theme])
  const props = { ds, idx, all, t }

  return (
    <div className="min-h-screen px-4 pb-10 sm:px-6 lg:px-8">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 -mx-4 border-b border-line bg-page/95 px-4 pt-3 pb-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">◆</span>
            <div>
              <h1 className="text-base font-semibold leading-tight text-ink">Ecosistema Steam</h1>
              <p className="text-xs text-muted">Economía del gaming, precios y retención</p>
            </div>
          </div>
          <nav className="order-3 w-full overflow-x-auto sm:order-none sm:w-auto" aria-label="Vistas">
            <ul className="flex gap-1">
              {VIEWS.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setView(v.id)}
                    aria-current={view === v.id ? 'page' : undefined}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${view === v.id ? 'bg-surface-2 font-medium text-ink' : 'text-ink-2 hover:text-ink'}`}
                  >
                    {v.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setConceptOpen(true)} className="h-9 rounded-lg bg-accent px-3 text-sm font-medium text-white hover:opacity-90">
              Evalúa tu concepto ▸
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 rounded-lg border border-line text-ink-2 hover:bg-surface-2"
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </div>
        <div className="mt-3">
          <FilterBar ds={ds} />
        </div>
      </header>

      <main className={`mt-4 transition-opacity ${stale ? 'opacity-60' : ''}`} aria-busy={stale}>
        {view === 'panorama' && <OverviewView {...props} />}
        {view === 'precio' && <PricingView {...props} />}
        {view === 'nichos' && <NichesView {...props} />}
        {view === 'retencion' && <RetentionView {...props} />}
      </main>

      <footer className="mt-8 flex flex-col gap-2 border-t border-line pt-4 text-xs text-muted">
        <p>
          <span aria-hidden>ⓘ</span> <b className="text-ink-2">Nota metodológica:</b> medianas en lugar de promedios ·
          recepción = límite inferior de Wilson al 95 % · universo de {fmtInt(ds.size)} juegos con ≥ 10 reseñas ·
          precios de lista reconstruidos (sin descuento) · las relaciones mostradas son asociaciones, no causalidad.
        </p>
        <p>
          Datos: Steam Games Dataset (FronkonGames, Kaggle), snapshot {ds.snapshotDate} · gráficos: snapshot del ETL ·
          consultas en vivo: PostgreSQL (Supabase) <span className="text-ink-2">{dbStatus}</span> ·
          Desarrollo: <b className="text-ink-2">Aldo Arceo Beltrán</b>
        </p>
      </footer>
      <ConceptPanel ds={ds} />
    </div>
  )
}
