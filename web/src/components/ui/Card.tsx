import { useState, type ReactNode } from 'react'
import { fmtInt } from '../../lib/format'

export interface TableSpec {
  columns: string[]
  rows: (string | number)[][]
}

interface Props {
  title: string
  subtitle?: string
  n?: number
  table?: TableSpec
  children: ReactNode
  className?: string
}

const MIN_N = 30

/** Tarjeta de gráfica: título, n visible, aviso de muestra pequeña y alternancia con su tabla. */
export function ChartCard({ title, subtitle, n, table, children, className = '' }: Props) {
  const [showTable, setShowTable] = useState(false)
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 ${className}`}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="text-xs text-muted">
            {subtitle}
            {n != null && <> · n = <span className="tabular">{fmtInt(n)}</span></>}
          </p>
          {n != null && n < MIN_N && (
            <p className="mt-1 text-xs font-medium text-ink-2">
              <span aria-hidden>⚠</span> Muestra insuficiente (n &lt; {MIN_N}): interpreta con cautela.
            </p>
          )}
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="rounded-md border border-line px-2 py-1 text-xs text-ink-2 hover:bg-surface-2"
            aria-pressed={showTable}
          >
            {showTable ? 'Ver gráfica' : 'Ver tabla'}
          </button>
        )}
      </header>
      {showTable && table ? <DataTable {...table} /> : children}
    </section>
  )
}

export function DataTable({ columns, rows }: TableSpec) {
  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-line">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-surface-2 text-ink-2">
          <tr>{columns.map((c) => <th key={c} className="px-3 py-2 font-medium">{c}</th>)}</tr>
        </thead>
        <tbody className="tabular">
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((v, j) => <td key={j} className="px-3 py-1.5 text-ink">{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StatTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-2">{note}</p>
    </div>
  )
}
