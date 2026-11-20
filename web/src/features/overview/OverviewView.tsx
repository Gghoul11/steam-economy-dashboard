import { useMemo } from 'react'
import { EChart } from '../../components/charts/EChart'
import { axis, barItem, baseOption } from '../../components/charts/base'
import { ChartCard, StatTile } from '../../components/ui/Card'
import { byMonth, summarize, yearly } from '../../lib/engine'
import { fmtDec, fmtDelta, fmtHours, fmtInt, fmtPct, fmtUsd, MONTHS } from '../../lib/format'
import type { ChartTokens } from '../../lib/theme'
import type { ViewProps } from '../types'

type Years = ReturnType<typeof yearly>

function launchesOption(t: ChartTokens, years: Years) {
  return {
    ...baseOption(t),
    legend: { top: 0, right: 0, textStyle: { color: t.ink2, fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
    grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
    tooltip: { ...baseOption(t).tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => fmtInt(v) },
    xAxis: { type: 'category', data: years.map((y) => y.year), ...axis(t) },
    yAxis: { type: 'value', ...axis(t) },
    series: [
      { name: 'Todos los lanzamientos', type: 'bar', data: years.map((y) => y.allLaunches), itemStyle: barItem(t.deemph), barGap: '-100%', barWidth: '60%' },
      { name: 'Segmento filtrado (maduro)', type: 'bar', data: years.map((y) => y.n), itemStyle: barItem(t.accent), barWidth: '60%' },
    ],
  }
}

function lineOption(t: ChartTokens, years: Years, key: 'medianPrice' | 'medianWilson', name: string, fmt: (v: number) => string) {
  return {
    ...baseOption(t),
    tooltip: { ...baseOption(t).tooltip, trigger: 'axis', valueFormatter: (v: number) => fmt(v) },
    xAxis: { type: 'category', data: years.map((y) => y.year), boundaryGap: false, ...axis(t) },
    yAxis: { type: 'value', scale: true, ...axis(t) },
    series: [{
      name, type: 'line', data: years.map((y) => (Number.isFinite(y[key]) ? +y[key].toFixed(2) : null)),
      symbol: 'circle', symbolSize: 8, lineStyle: { width: 2, color: t.accent },
      itemStyle: { color: t.accent, borderColor: t.surface, borderWidth: 2 },
    }],
  }
}

function monthOption(t: ChartTokens, months: ReturnType<typeof byMonth>) {
  return {
    ...baseOption(t),
    tooltip: {
      ...baseOption(t).tooltip, trigger: 'item',
      formatter: (p: { dataIndex: number }) => {
        const m = months[p.dataIndex]
        return `<b>${MONTHS[m.month]}</b><br/>Lanzamientos: ${fmtInt(m.n)}<br/>Wilson mediano: ${fmtDec(m.medianWilson)}`
      },
    },
    xAxis: { type: 'category', data: MONTHS, ...axis(t) },
    yAxis: { type: 'value', ...axis(t) },
    series: [{ type: 'bar', barWidth: '55%', data: months.map((m) => m.n), itemStyle: barItem(t.accent) }],
  }
}

export function OverviewView({ ds, idx, all, t }: ViewProps) {
  const s = useMemo(() => summarize(ds, idx), [ds, idx])
  const base = useMemo(() => summarize(ds, all), [ds, all])
  const years = useMemo(() => yearly(ds, idx), [ds, idx])
  const months = useMemo(() => byMonth(ds, idx), [ds, idx])
  const launches = useMemo(() => launchesOption(t, years), [t, years])
  const priceLine = useMemo(() => lineOption(t, years, 'medianPrice', 'Precio de lista mediano', fmtUsd), [t, years])
  const wilsonLine = useMemo(() => lineOption(t, years, 'medianWilson', 'Recepción mediana (Wilson)', fmtDec), [t, years])
  const monthOpt = useMemo(() => monthOption(t, months), [t, months])

  const share = all.length ? s.n / all.length : 0
  const matureN = years.reduce((a, y) => a + y.n, 0)
  const yearTable = {
    columns: ['Año', 'Lanzamientos (todos)', 'Segmento', 'Precio mediano', 'Wilson mediano'],
    rows: years.map((y) => [y.year, fmtInt(y.allLaunches), fmtInt(y.n), fmtUsd(y.medianPrice), fmtDec(y.medianWilson)]),
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Juegos" value={fmtInt(s.n)} note={`${fmtPct(share)} del universo`} />
        <StatTile label="Precio de lista mediano" value={fmtUsd(s.medianPrice)} note={fmtDelta(s.medianPrice, base.medianPrice, 'usd') || `n = ${fmtInt(s.nPrice)}`} />
        <StatTile label="Recepción (Wilson)" value={fmtDec(s.medianWilson)} note={fmtDelta(s.medianWilson, base.medianWilson, 'pts')} />
        <StatTile label="Horas medianas" value={fmtHours(s.medianPlaytime)} note={`n = ${fmtInt(s.nPlaytime)} con dato`} />
        <StatTile label="Proporción F2P" value={fmtPct(s.f2pShare)} note={fmtDelta(s.f2pShare, base.f2pShare, 'pct')} />
      </div>

      <ChartCard
        title="Lanzamientos por año (K12)"
        subtitle="Gris: todos los juegos publicados · azul: segmento filtrado con ≥ 12 meses de antigüedad"
        n={matureN}
        table={yearTable}
      >
        <EChart option={launches} height={280} ariaLabel="Lanzamientos por año" />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Precio de lista mediano por año" subtitle="Pago sin atípicos · años con n ≥ 30" table={yearTable}>
          <EChart option={priceLine} height={240} ariaLabel="Precio de lista mediano por año" />
        </ChartCard>
        <ChartCard title="Recepción mediana por año" subtitle="Wilson · los años recientes tienen sesgo de supervivencia" table={yearTable}>
          <EChart option={wilsonLine} height={240} ariaLabel="Recepción mediana por año" />
        </ChartCard>
        <ChartCard
          title="Estacionalidad de lanzamientos"
          subtitle="Lanzamientos por mes (2018+, maduros) · el efecto en recepción es débil"
          n={months.reduce((a, m) => a + m.n, 0)}
          table={{ columns: ['Mes', 'Lanzamientos', 'Wilson mediano'], rows: months.map((m) => [MONTHS[m.month], fmtInt(m.n), fmtDec(m.medianWilson)]) }}
        >
          <EChart option={monthOpt} height={240} ariaLabel="Lanzamientos por mes" />
        </ChartCard>
      </div>
    </div>
  )
}
