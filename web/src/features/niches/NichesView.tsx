import { useMemo, useState } from 'react'
import { EChart } from '../../components/charts/EChart'
import { axis, baseOption } from '../../components/charts/base'
import { ChartCard } from '../../components/ui/Card'
import { tagStats, type TagStat } from '../../lib/engine'
import { fmtDec, fmtHours, fmtInt, fmtUsd } from '../../lib/format'
import { median } from '../../lib/stats'
import { useFilters } from '../../store/filters'
import type { ViewProps } from '../types'

type SortKey = 'opportunity' | 'n' | 'medianWilson' | 'medianPrice' | 'medianPlaytime' | 'launches24m'
const HEAT_TAGS = 20
const HEAT_YEARS = 12

export function NichesView({ ds, idx, t }: ViewProps) {
  const { filters, toggleIn } = useFilters()
  const stats = useMemo(() => tagStats(ds, idx), [ds, idx])
  const [sort, setSort] = useState<SortKey>('opportunity')
  const sorted = useMemo(
    () => [...stats].sort((a, b) => (Number.isFinite(b[sort]) ? b[sort] : -1) - (Number.isFinite(a[sort]) ? a[sort] : -1)),
    [stats, sort],
  )
  const top = useMemo(() => new Set(sorted.slice(0, 10).map((s) => s.key)), [sorted])
  const medW = useMemo(() => median(stats.map((s) => s.medianWilson)), [stats])
  const medN = useMemo(() => median(stats.map((s) => s.n)), [stats])

  const mapOpt = useMemo(() => ({
    ...baseOption(t),
    grid: { left: 8, right: 24, top: 16, bottom: 40, containLabel: true },
    tooltip: {
      ...baseOption(t).tooltip, trigger: 'item',
      formatter: (p: { data: { s: TagStat } }) => {
        const s = p.data.s
        return `<b>${s.label}</b><br/>Títulos: ${fmtInt(s.n)}<br/>Wilson mediano: ${fmtDec(s.medianWilson)}<br/>Oportunidad: ${fmtDec(s.opportunity)}<br/><i>Clic para filtrar</i>`
      },
    },
    xAxis: { type: 'log', name: 'Saturación: títulos con el tag (escala log)', nameLocation: 'middle', nameGap: 26, ...axis(t) },
    yAxis: { type: 'value', name: 'Wilson mediano', scale: true, ...axis(t) },
    series: [{
      type: 'scatter', cursor: 'pointer',
      data: stats.map((s) => ({
        value: [s.n, +s.medianWilson.toFixed(1)], s,
        symbolSize: top.has(s.key) ? 10 : 7,
        itemStyle: {
          color: top.has(s.key) || filters.tags.includes(s.key) ? t.accent : t.deemph,
          borderColor: t.surface, borderWidth: 2,
        },
        label: { show: top.has(s.key), formatter: s.label, position: 'right', color: t.ink, fontSize: 11 },
      })),
      markLine: {
        silent: true, symbol: 'none', lineStyle: { color: t.axis, type: 'solid', width: 1 },
        label: { color: t.muted, fontSize: 10 },
        data: [{ yAxis: +medW.toFixed(1), label: { formatter: 'mediana Wilson' } }, { xAxis: medN, label: { formatter: 'mediana títulos' } }],
      },
      markArea: {
        silent: true, itemStyle: { color: t.accent, opacity: 0.05 },
        label: { show: true, position: 'insideTopLeft', color: t.ink2, fontSize: 11, formatter: 'Alta recepción · poca competencia' },
        data: [[{ xAxis: 'min', yAxis: +medW.toFixed(1) }, { xAxis: medN, yAxis: 'max' }]],
      },
    }],
  }), [stats, top, medW, medN, filters.tags, t])

  // K9: heatmap tag × año (oferta de TODOS los juegos publicados, no solo el universo)
  const heat = useMemo(() => {
    const years = ds.meta.trendYears.slice(-HEAT_YEARS)
    const offset = ds.meta.trendYears.length - HEAT_YEARS
    const tags = [...stats].sort((a, b) => b.n - a.n).slice(0, HEAT_TAGS).map((s) => s.label).reverse()
    const cells: [number, number, number][] = []
    let max = 0
    tags.forEach((tag, y) => {
      const series = ds.meta.tagLaunchesByYear[tag] ?? []
      years.forEach((_, x) => {
        const v = series[offset + x] ?? 0
        max = Math.max(max, v)
        cells.push([x, y, v])
      })
    })
    return { years, tags, cells, max }
  }, [ds, stats])

  const heatOpt = useMemo(() => ({
    ...baseOption(t),
    grid: { left: 8, right: 16, top: 8, bottom: 56, containLabel: true },
    tooltip: {
      ...baseOption(t).tooltip, trigger: 'item',
      formatter: (p: { value: [number, number, number] }) => `<b>${heat.tags[p.value[1]]}</b> · ${heat.years[p.value[0]]}<br/>Lanzamientos: ${fmtInt(p.value[2])}`,
    },
    xAxis: { type: 'category', data: heat.years, ...axis(t), splitLine: { show: false } },
    yAxis: { type: 'category', data: heat.tags, ...axis(t), splitLine: { show: false } },
    visualMap: {
      min: 0, max: heat.max, calculable: false, orient: 'horizontal', left: 'center', bottom: 0,
      itemWidth: 10, itemHeight: 120, textStyle: { color: t.muted, fontSize: 10 },
      inRange: { color: t.sequential },
      text: ['más lanzamientos', 'menos'],
    },
    series: [{ type: 'heatmap', data: heat.cells, itemStyle: { borderColor: t.surface, borderWidth: 2, borderRadius: 2 } }],
  }), [heat, t])

  const headers: { key: SortKey | 'label'; label: string }[] = [
    { key: 'label', label: 'Tag' },
    { key: 'n', label: 'Títulos' },
    { key: 'medianWilson', label: 'Wilson' },
    { key: 'medianPrice', label: 'Precio med.' },
    { key: 'medianPlaytime', label: 'Horas med.' },
    { key: 'launches24m', label: 'Lanz. 2024–25' },
    { key: 'opportunity', label: 'Oportunidad' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <ChartCard
        title="Mapa de oportunidad de nichos (K8)"
        subtitle="Un punto por tag con ≥ 30 títulos en el segmento · resaltados: top 10 por índice de oportunidad · clic para filtrar"
        n={stats.length}
      >
        <EChart option={mapOpt} height={420} ariaLabel="Saturación contra recepción por tag"
          onClick={(e) => toggleIn('tags', (e.data as { s: TagStat }).s.key)} />
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Saturación por tag y año (K9)"
          subtitle="Lanzamientos de todos los juegos publicados · top 20 tags del segmento"
          table={{ columns: ['Tag', ...heat.years.map(String)], rows: [...heat.tags].reverse().map((tag) => [tag, ...heat.years.map((_, x) => fmtInt(heat.cells.find((c) => heat.tags[c[1]] === tag && c[0] === x)?.[2] ?? 0))]) }}
        >
          <EChart option={heatOpt} height={520} ariaLabel="Mapa de calor de lanzamientos por tag y año" />
        </ChartCard>

        <ChartCard title="Tabla explorable de tags" subtitle="Clic en un encabezado para ordenar · clic en una fila para filtrar" n={stats.length}>
          <div className="max-h-[520px] overflow-auto rounded-lg border border-line">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-2 text-ink-2">
                <tr>
                  {headers.map((h) => (
                    <th key={h.key} className="px-3 py-2 font-medium">
                      {h.key === 'label' ? h.label : (
                        <button type="button" onClick={() => setSort(h.key as SortKey)} className={sort === h.key ? 'text-accent' : ''}>
                          {h.label}{sort === h.key ? ' ↓' : ''}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular">
                {sorted.map((s) => (
                  <tr
                    key={s.key}
                    onClick={() => toggleIn('tags', s.key)}
                    className={`cursor-pointer border-t border-line hover:bg-surface-2 ${filters.tags.includes(s.key) ? 'bg-surface-2' : ''}`}
                  >
                    <td className="px-3 py-1.5 font-medium text-ink">{s.label}</td>
                    <td className="px-3 py-1.5 text-ink">{fmtInt(s.n)}</td>
                    <td className="px-3 py-1.5 text-ink">{fmtDec(s.medianWilson)}</td>
                    <td className="px-3 py-1.5 text-ink">{fmtUsd(s.medianPrice)}</td>
                    <td className="px-3 py-1.5 text-ink">{fmtHours(s.medianPlaytime)}</td>
                    <td className="px-3 py-1.5 text-ink">{fmtInt(s.launches24m)}</td>
                    <td className="px-3 py-1.5 font-semibold text-ink">{fmtDec(s.opportunity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
