import { useMemo } from 'react'
import { EChart } from '../../components/charts/EChart'
import { axis, barItem, baseOption } from '../../components/charts/base'
import { ChartCard } from '../../components/ui/Card'
import { byBand, gapsByGenre, priceBoxByGenre, scatterByModel } from '../../lib/engine'
import { fmtDec, fmtHours, fmtInt, fmtUsd } from '../../lib/format'
import { useFilters } from '../../store/filters'
import type { ViewProps } from '../types'

export function PricingView({ ds, idx, t }: ViewProps) {
  const { filters, toggleIn } = useFilters()
  const bands = useMemo(() => byBand(ds, idx), [ds, idx])
  const boxes = useMemo(() => priceBoxByGenre(ds, idx), [ds, idx])
  const scatter = useMemo(() => scatterByModel(ds, idx, 'price', true), [ds, idx])
  const gaps = useMemo(() => gapsByGenre(ds, idx), [ds, idx])
  const nPaid = bands.reduce((a, b) => a + b.n, 0)

  const bandOpt = useMemo(() => ({
    ...baseOption(t),
    tooltip: {
      ...baseOption(t).tooltip, trigger: 'item',
      formatter: (p: { dataIndex: number }) => {
        const b = bands[p.dataIndex]
        return `<b>${b.label}</b><br/>Wilson mediano: ${fmtDec(b.medianWilson)}<br/>n = ${fmtInt(b.n)}<br/><i>Clic para filtrar</i>`
      },
    },
    xAxis: { type: 'category', data: bands.map((b) => `${b.label}\nn=${fmtInt(b.n)}`), ...axis(t) },
    yAxis: { type: 'value', name: 'Wilson', min: (v: { min: number }) => Math.max(0, Math.floor(v.min - 10)), ...axis(t) },
    series: [{
      type: 'bar', barWidth: '50%', cursor: 'pointer',
      data: bands.map((b) => ({
        value: Number.isFinite(b.medianWilson) ? +b.medianWilson.toFixed(1) : null,
        itemStyle: barItem(filters.bands.length === 0 || filters.bands.includes(b.key) ? t.accent : t.deemph),
      })),
      label: { show: true, position: 'top', color: t.ink2, fontSize: 11, formatter: (p: { value: number }) => fmtDec(p.value) },
    }],
  }), [bands, filters.bands, t])

  const boxOpt = useMemo(() => {
    const rows = [...boxes].reverse()
    return {
      ...baseOption(t),
      tooltip: {
        ...baseOption(t).tooltip, trigger: 'item',
        formatter: (p: { dataIndex: number }) => {
          const b = rows[p.dataIndex]
          return `<b>${b.label}</b> (n = ${fmtInt(b.n)})<br/>P10 ${fmtUsd(b.p10)} · P25 ${fmtUsd(b.p25)}<br/>Mediana ${fmtUsd(b.p50)}<br/>P75 ${fmtUsd(b.p75)} · P90 ${fmtUsd(b.p90)}`
        },
      },
      yAxis: { type: 'category', data: rows.map((b) => b.label), ...axis(t), splitLine: { show: false } },
      xAxis: { type: 'value', name: 'USD', ...axis(t) },
      series: [{
        type: 'boxplot', layout: 'horizontal', boxWidth: [8, 16], cursor: 'pointer',
        data: rows.map((b) => {
          const on = filters.genres.length === 0 || filters.genres.includes(b.genre)
          return { value: [b.p10, b.p25, b.p50, b.p75, b.p90], itemStyle: { color: on ? t.accent + '33' : 'transparent', borderColor: on ? t.accent : t.deemph, borderWidth: 1.5 } }
        }),
      }],
    }
  }, [boxes, filters.genres, t])

  const scatterOpt = useMemo(() => ({
    ...baseOption(t),
    legend: { top: 0, right: 0, textStyle: { color: t.ink2, fontSize: 11 } },
    grid: { left: 8, right: 16, top: 32, bottom: 40, containLabel: true },
    tooltip: {
      ...baseOption(t).tooltip, trigger: 'item',
      formatter: (p: { value: [number, number, number] }) => {
        const i = p.value[2]
        return `<b>${ds.name[i]}</b><br/>Precio de lista: ${fmtUsd(ds.price[i])}<br/>Wilson: ${fmtDec(ds.wilson[i])}<br/>Reseñas: ${fmtInt(ds.reviews[i])}`
      },
    },
    xAxis: { type: 'log', name: 'Precio de lista (USD, escala log)', nameLocation: 'middle', nameGap: 26, min: 0.5, max: 100, ...axis(t) },
    yAxis: { type: 'value', name: 'Wilson', min: 0, max: 100, ...axis(t) },
    dataZoom: [{ type: 'inside', xAxisIndex: 0 }, { type: 'inside', yAxisIndex: 0 }],
    series: scatter.map((pts, m) => ({
      name: ds.models[m], type: 'scatter', data: pts, symbolSize: 4, large: true, largeThreshold: 3000,
      itemStyle: { color: t.models[m], opacity: 0.45 },
    })).filter((s) => s.data.length > 0),
  }), [scatter, ds, t])

  const gapOpt = useMemo(() => {
    const rows = [...gaps].reverse()
    const lo = rows.map((g) => Math.min(g.wilsonDlc, g.wilsonNoDlc))
    const span = rows.map((g) => {
      const d = Math.abs(g.wilsonDlc - g.wilsonNoDlc)
      return Number.isFinite(d) ? d : 0
    })
    return {
      ...baseOption(t),
      legend: { top: 0, right: 0, data: ['Con DLC', 'Sin DLC'], textStyle: { color: t.ink2, fontSize: 11 } },
      grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
      tooltip: { ...baseOption(t).tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => fmtDec(v) },
      yAxis: { type: 'category', data: rows.map((g) => g.label), ...axis(t), splitLine: { show: false } },
      xAxis: { type: 'value', name: 'Wilson mediano', scale: true, ...axis(t) },
      series: [
        { type: 'bar', stack: 'gap', data: lo, itemStyle: { color: 'transparent' }, silent: true, tooltip: { show: false }, barWidth: 2 },
        { type: 'bar', stack: 'gap', data: span, itemStyle: { color: t.axis }, silent: true, tooltip: { show: false }, barWidth: 2 },
        { name: 'Con DLC', type: 'scatter', data: rows.map((g) => +g.wilsonDlc.toFixed(1)), symbolSize: 10, itemStyle: { color: t.accent, borderColor: t.surface, borderWidth: 2 }, z: 3 },
        { name: 'Sin DLC', type: 'scatter', data: rows.map((g) => +g.wilsonNoDlc.toFixed(1)), symbolSize: 10, itemStyle: { color: t.deemph, borderColor: t.surface, borderWidth: 2 }, z: 3 },
      ],
    }
  }, [gaps, t])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Recepción por banda de precio (K6)"
        subtitle="Wilson mediano, juegos de pago · clic en una barra para filtrar"
        n={nPaid}
        table={{ columns: ['Banda', 'n', 'Wilson mediano', 'Horas medianas'], rows: bands.map((b) => [b.label, fmtInt(b.n), fmtDec(b.medianWilson), fmtHours(b.medianPlaytime)]) }}
      >
        <EChart option={bandOpt} height={300} ariaLabel="Wilson mediano por banda de precio"
          onClick={(e) => toggleIn('bands', bands[e.dataIndex].key)} />
      </ChartCard>

      <ChartCard
        title="Distribución de precio por género (K7)"
        subtitle="Caja P25–P75, bigotes P10–P90 · clic para filtrar género"
        table={{ columns: ['Género', 'n', 'P10', 'P25', 'Mediana', 'P75', 'P90'], rows: boxes.map((b) => [b.label, fmtInt(b.n), fmtUsd(b.p10), fmtUsd(b.p25), fmtUsd(b.p50), fmtUsd(b.p75), fmtUsd(b.p90)]) }}
      >
        <EChart option={boxOpt} height={300} ariaLabel="Distribución de precio por género"
          onClick={(e) => toggleIn('genres', [...boxes].reverse()[e.dataIndex].genre)} />
      </ChartCard>

      <ChartCard
        title="Precio de lista vs. recepción"
        subtitle="Un punto por juego de pago · rueda del ratón para hacer zoom"
        n={scatter.reduce((a, s) => a + s.length, 0)}
      >
        <EChart option={scatterOpt} height={340} ariaLabel="Dispersión de precio contra recepción" />
      </ChartCard>

      <ChartCard
        title="Prima de DLC por género (K13)"
        subtitle="Wilson mediano con y sin DLC · asociación, no causalidad"
        table={{
          columns: ['Género', 'Wilson con DLC', 'Wilson sin DLC', 'Precio indie', 'Precio no indie'],
          rows: gaps.map((g) => [g.label, fmtDec(g.wilsonDlc), fmtDec(g.wilsonNoDlc), fmtUsd(g.priceIndie), fmtUsd(g.priceNoIndie)]),
        }}
      >
        <EChart option={gapOpt} height={340} ariaLabel="Diferencia de recepción con y sin DLC por género" />
      </ChartCard>
    </div>
  )
}
