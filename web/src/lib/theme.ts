import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'
const KEY = 'steam-dash-theme'

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* almacenamiento bloqueado */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

let current: Theme = initial()
document.documentElement.dataset.theme = current
const listeners = new Set<() => void>()

export function setTheme(t: Theme) {
  current = t
  document.documentElement.dataset.theme = t
  try { localStorage.setItem(KEY, t) } catch { /* sin persistencia */ }
  listeners.forEach((l) => l())
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => current,
  )
}

/** Lee los tokens CSS vigentes para pasarlos a ECharts (que no entiende var()). */
export function chartTokens() {
  const s = getComputedStyle(document.documentElement)
  const v = (name: string) => s.getPropertyValue(name).trim()
  return {
    surface: v('--surface'),
    ink: v('--ink'),
    ink2: v('--ink-2'),
    muted: v('--muted'),
    grid: v('--grid'),
    axis: v('--axis'),
    accent: v('--accent'),
    deemph: v('--deemph'),
    models: [v('--series-pago'), v('--series-f2p'), v('--series-gratis')],
    sequential: current === 'dark'
      ? ['#232321', '#104281', '#1c5cab', '#2a78d6', '#5598e7', '#9ec5f4']
      : ['#f2f1ed', '#cde2fb', '#9ec5f4', '#5598e7', '#2a78d6', '#184f95'],
  }
}
export type ChartTokens = ReturnType<typeof chartTokens>
