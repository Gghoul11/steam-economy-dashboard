import { BarChart, BoxplotChart, HeatmapChart, LineChart, ScatterChart } from 'echarts/charts'
import {
  DataZoomComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent,
  TooltipComponent, VisualMapComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption, ECElementEvent } from 'echarts/core'
import { useEffect, useRef } from 'react'

echarts.use([
  BarChart, BoxplotChart, HeatmapChart, LineChart, ScatterChart, DataZoomComponent, GridComponent,
  LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent, VisualMapComponent, CanvasRenderer,
])

interface Props {
  option: EChartsCoreOption
  height?: number
  ariaLabel: string
  onClick?: (e: ECElementEvent) => void
}

/** Envoltorio mínimo de ECharts para React 19 (sin dependencias extra). */
export function EChart({ option, height = 300, ariaLabel, onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const chart = useRef<echarts.ECharts | null>(null)
  const clickRef = useRef(onClick)
  useEffect(() => { clickRef.current = onClick }, [onClick])

  useEffect(() => {
    const el = ref.current!
    const c = echarts.init(el, undefined, { renderer: 'canvas' })
    chart.current = c
    c.on('click', (e) => clickRef.current?.(e as ECElementEvent))
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(el)
    return () => { ro.disconnect(); c.dispose(); chart.current = null }
  }, [])

  useEffect(() => {
    chart.current?.setOption(option, { notMerge: true, lazyUpdate: true })
  }, [option])

  return <div ref={ref} role="img" aria-label={ariaLabel} style={{ height, width: '100%' }} />
}
