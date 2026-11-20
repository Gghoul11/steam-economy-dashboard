import type { ChartTokens } from '../lib/theme'
import type { Dataset } from '../types/data'

export interface ViewProps {
  ds: Dataset
  /** Índices de filas que pasan los filtros globales */
  idx: Int32Array
  /** Universo completo (para comparar "vs. Steam") */
  all: Int32Array
  t: ChartTokens
}
