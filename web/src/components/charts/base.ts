import type { ChartTokens } from '../../lib/theme'

/** Estilo común: rejilla y ejes recesivos de línea fina, texto en tinta (nunca color de serie). */
export function baseOption(t: ChartTokens) {
  return {
    backgroundColor: 'transparent',
    animationDuration: 300,
    textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: t.ink2 },
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      backgroundColor: t.surface,
      borderColor: t.axis,
      borderWidth: 1,
      textStyle: { color: t.ink, fontSize: 12 },
      extraCssText: 'box-shadow:0 4px 16px rgba(0,0,0,.12);border-radius:8px;',
    },
  }
}

export function axis(t: ChartTokens, extra: Record<string, unknown> = {}) {
  return {
    axisLine: { lineStyle: { color: t.axis } },
    axisTick: { show: false },
    axisLabel: { color: t.muted, fontSize: 11 },
    splitLine: { lineStyle: { color: t.grid, width: 1 } },
    nameTextStyle: { color: t.muted, fontSize: 11 },
    ...extra,
  }
}

/** Marca de datos fina con extremo redondeado (4px) anclado a la base. */
export const barItem = (color: string) => ({ color, borderRadius: [4, 4, 0, 0] })
export const hbarItem = (color: string) => ({ color, borderRadius: [0, 4, 4, 0] })
