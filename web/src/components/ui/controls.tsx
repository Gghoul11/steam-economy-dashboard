import { useEffect, useId, useMemo, useRef, useState } from 'react'

interface MultiSelectProps {
  label: string
  options: { value: number; label: string }[]
  selected: number[]
  onToggle: (value: number) => void
  searchable?: boolean
}

/** Combobox de selección múltiple con búsqueda; se cierra al hacer clic fuera o con Escape. */
export function MultiSelect({ label, options, selected, onToggle, searchable }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = s ? options.filter((o) => o.label.toLowerCase().includes(s)) : options
    return list.slice(0, 200)
  }, [q, options])

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-ink hover:bg-surface-2"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        {selected.length > 0 && (
          <span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-white">{selected.length}</span>
        )}
        <span aria-hidden className="text-muted">▾</span>
      </button>
      {open && (
        <div id={listId} className="absolute left-0 z-30 mt-1 w-64 rounded-lg border border-line bg-surface p-2 shadow-lg">
          {searchable && (
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="mb-2 h-8 w-full rounded-md border border-line bg-page px-2 text-sm text-ink"
            />
          )}
          <ul className="max-h-72 overflow-auto" role="listbox" aria-multiselectable>
            {visible.map((o) => {
              const on = selected.includes(o.value)
              return (
                <li key={o.value}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-ink hover:bg-surface-2">
                    <input type="checkbox" checked={on} onChange={() => onToggle(o.value)} className="accent-[var(--accent)]" />
                    {o.label}
                  </label>
                </li>
              )
            })}
            {visible.length === 0 && <li className="px-2 py-1.5 text-sm text-muted">Sin resultados</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

interface SegmentedProps<T extends string | number> {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}

export function Segmented<T extends string | number>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex h-9 rounded-lg border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 text-sm ${o.value === value ? 'bg-surface-2 font-medium text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface YearRangeProps {
  years: number[]
  value: [number, number]
  onChange: (v: [number, number]) => void
}

export function YearRange({ years, value, onChange }: YearRangeProps) {
  const cls = 'h-9 rounded-lg border border-line bg-surface px-2 text-sm text-ink'
  return (
    <div className="flex items-center gap-1 text-sm text-ink-2">
      <label className="sr-only" htmlFor="y0">Desde</label>
      <select id="y0" className={cls} value={value[0]} onChange={(e) => onChange([Math.min(+e.target.value, value[1]), value[1]])}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      –
      <label className="sr-only" htmlFor="y1">Hasta</label>
      <select id="y1" className={cls} value={value[1]} onChange={(e) => onChange([value[0], Math.max(+e.target.value, value[0])])}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}
