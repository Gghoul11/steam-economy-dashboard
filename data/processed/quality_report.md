# Reporte de calidad del pipeline

- Snapshot del dataset (último lanzamiento con reseñas): **2025-12-25**
- Filas crudas: **125,855** · duplicados eliminados: 0
- Horas de juego inverosímiles (> 5,000 h) anuladas: 4

## Exclusiones del universo analítico
| Regla | Títulos |
|---|---|
| Ruido (playtest, demo, soundtrack) | 8,209 |
| Software / sin género de juego | 1,497 |
| Sin fecha de lanzamiento | 0 |
| Menos de 10 reseñas | 60,231 |
| **Universo analítico** | **55,918** |

## KPIs de referencia del universo
| KPI | Valor | n |
|---|---|---|
| Precio de lista mediano (pago, sin atípicos) | $5.99 | 48,662 |
| Recepción mediana (Wilson) | 68.9 | 55,918 |
| Horas medianas | 3.4 h | 23,557 |
| Proporción F2P | 8.8 % | 55,918 |

## Marcas de valores atípicos (dentro del universo)
- Precio > $80: 138
- Horas fuera de 1,5·IQR (log, por género principal): 625
- Lanzamientos previos a 2003: 12
- Cohortes maduras (≥ 365 días): 52,747
