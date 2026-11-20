import { useMemo } from 'react'
import { EChart } from '../../components/charts/EChart'
import { axis, barItem, baseOption, hbarItem } from '../../components/charts/base'
import { ChartCard } from '../../components/ui/Card'
import { byBand, ccuLeaders, playtimeByModel, scatterByModel } from '../../lib/engine'
import { fmtCompact, fmtDec, fmtHours, fmtInt } from '../../lib/format'
import type { ViewProps } from '../types'

export function RetentionView({ ds, idx, t }: ViewProps) {
  const models = useMemo(() => playtimeByModel(ds, idx), [ds, idx])
  const bands = useMemo(() => byBand(ds, idx), [ds, idx])
  const scatter = useMemo(() => scatterByModel(ds, idx, 'playtime', false), [ds, idx])
  const leaders = useMemo(() => ccuLeaders(ds, idx), [ds, idx])
  const nPt = models.reduce((a, m) => a + m.n, 0)

  const modelOpt = useMemo(() => ({
    ...baseOption(t),
    tooltip: {
      ...baseOption(t).tooltip, trigger: 'item',
      formatter: (p: { dataIndex: number }) => {
        const m = models[p.dataIndex]
        return `<b>${m.label}</b> (n = ${fmtInt(m.n)})<br/>P25 ${fmtHours(m.p25)} · mediana ${fmtHours(m.p50)} · P75 ${fmtHours(m.p75)}`
      },
    },
    xAxis: { type: 'category', data: models.map((m) => `${m.label}\nn=${fmtInt(m.n)}`), ...axis(t), splitLine: { show: false } },
    yAxis: { type: 'log', name: 'Horas (log)', min: 0.1, ...axis(t) },
    series: [{
      type: 'boxplot', boxWidth: [16, 40],
      data: models.map((m, k) => ({
        value: [m.p10, m.p25, m.p50, m.p75, m.p90].map((v) => (Number.isFinite(v) ? v : null)),
        itemStyle: { color: t.models[k] + '33', borderColor: t.models[k], borderWidth: 1.5 },
      })),
    }],
  }), [models, t])

  const bandOpt = useMemo(() => ({
    ...baseOption(t),
    tooltip: { ...baseOption(t).tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => fmtHours(v) },
    xAxis: { type: 'category', data: bands.map((b) => `${b.label}\nn=${fmtInt(b.nPlaytime)}`), ...axis(t) },
    yAxis: { type: 'value', name: 'Horas medianas', ...axis(t) },
    series: [{
      type: 'bar', barWidth: '50%', itemStyle: barItem(t.accent),
      data: bands.map((b) => (Number.isFinite(b.medianPlaytime) ? +b.medianPlaytime.toFixed(1) : null)),
      label: { show: true, position: 'top', color: t.ink2, fontSize: 11, formatter: (p: { value: number }) => fmtHours(p.value) },
    }],
  }), [bands, t])

  const scatterOpt = useMemo(() => ({
    ...baseOption(t),
    legend: { top: 0, right: 0, textStyle: { color: t.ink2, fontSize: 11 } },
    grid: { left: 8, right: 16, top: 32, bottom: 40, containLabel: true },
    tooltip: {
      ...baseOption(t).tooltip, trigger: 'item',
      formatter: (p: { value: [number, number, number] }) => {
        const i = p.value[2]
        return `<b>${ds.name[i]}</b><br/>Horas medianas: ${fmtHours(ds.playtime[i])}<br/>Wilson: ${fmtDec(ds.wilson[i])}${ds.playtimeOutlier[i] ? '<br/><i>Atípico de horas para su género</i>' : ''}`
      },
    },
    xAxis: { type: 'log', name: 'Horas medianas (escala log)', nameLocation: 'middle', nameGap: 26, min: 0.1, ...axis(t) },
    yAxis: { type: 'value', name: 'Wilson', min: 0, max: 100, ...axis(t) },
    dataZoom: [{ type: 'inside', xAxisIndex: 0 }, { type: 'inside', yAxisIndex: 0 }],
    series: scatter.map((pts, m) => ({
      name: ds.models[m], type: 'scatter', data: pts, symbolSize: 4, large: true, largeThreshold: 3000,
      itemStyle: { color: t.models[m], opacity: 0.45 },
    })).filter((s) => s.data.length > 0),
  }), [scatter, ds, t])

  const leaderOpt = useMemo(() => {
    const rows = [...leaders].reverse()
    return {
      ...baseOption(t),
      grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
      tooltip: { ...baseOption(t).tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => fmtInt(v) },
      yAxis: { type: 'category', data: rows.map((r) => r.name), ...axis(t), splitLine: { show: false }, axisLabel: { color: t.ink2, fontSize: 11, width: 140, overflow: 'truncate' } },
      xAxis: { type: 'log', name: 'Peak CCU (log)', ...axis(t) },
      series: [{
        type: 'bar', barWidth: 10,
        data: rows.map((r) => ({ value: r.ccu, itemStyle: hbarItem(t.models[r.model]) })),
        label: { show: true, position: 'right', color: t.ink2, fontSize: 11, formatter: (p: { value: number }) => fmtCompact(p.value) },
      }],
    }
  }, [leaders, t])

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg border border-line bg-surface px-4 py-2 text-xs text-ink-2">
        <span aria-hidden>ⓘ</span> Retención: solo juegos con dato de SteamSpy (horas y Peak CCU en 0 se tratan como “sin dato”).
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Horas de juego por modelo de cobro (K10)"
          subtitle="Caja P25–P75, bigotes P10–P90 · escala logarítmica"
          n={nPt}
          table={{ columns: ['Modelo', 'n', 'P25', 'Mediana', 'P75'], rows: models.map((m) => [m.label, fmtInt(m.n), fmtHours(m.p25), fmtHours(m.p50), fmtHours(m.p75)]) }}
        >
          <EChart option={modelOpt} height={300} ariaLabel="Horas de juego por modelo de cobro" />
        </ChartCard>
        <ChartCard
          title="Horas medianas por banda de precio (K11)"
          subtitle="Juegos de pago con dato de horas"
          n={bands.reduce((a, b) => a + b.nPlaytime, 0)}
          table={{ columns: ['Banda', 'n horas', 'Horas medianas', 'n CCU', 'Peak CCU mediano'], rows: bands.map((b) => [b.label, fmtInt(b.nPlaytime), fmtHours(b.medianPlaytime), fmtInt(b.nCcu), fmtInt(b.medianCcu)]) }}
        >
          <EChart option={bandOpt} height={300} ariaLabel="Horas medianas por banda de precio" />
        </ChartCard>
        <ChartCard title="Horas de juego vs. recepción" subtitle="Un punto por juego con dato de horas · rueda para zoom" n={scatter.reduce((a, s) => a + s.length, 0)}>
          <EChart option={scatterOpt} height={340} ariaLabel="Dispersión de horas contra recepción" />
        </ChartCard>
        <ChartCard
          title="Líderes de jugadores concurrentes"
          subtitle="Top 12 por Peak CCU, separados para no distorsionar los agregados"
          table={{ columns: ['Juego', 'Modelo', 'Peak CCU'], rows: leaders.map((l) => [l.name, ds.models[l.model], fmtInt(l.ccu)]) }}
        >
          <EChart option={leaderOpt} height={340} ariaLabel="Juegos con mayor pico de jugadores concurrentes" />
        </ChartCard>
      </div>
    </div>
  )
}
