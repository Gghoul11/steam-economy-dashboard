# Arquitectura

## Flujo de datos
```mermaid
flowchart LR
  CSV["games.csv<br/>125 855 títulos<br/>(Kaggle)"] --> EX[extract.py<br/>corrige cabecera]
  EX --> CL[clean.py<br/>limpieza · segmentación · atípicos]
  CL --> VA[validate.py<br/>Pandera · reporte de calidad]
  VA --> LO[load.py<br/>COPY + upsert]
  VA --> SN[snapshot.py<br/>JSON columnar]
  LO --> PG[(PostgreSQL · Supabase<br/>games + vistas materializadas<br/>RPC · RLS)]
  SN --> CDN[Vercel CDN<br/>games.json · meta.json]
  CDN --> APP[React · motor de KPIs]
  PG -- "rpc_concept_benchmark<br/>rpc_health" --> APP
  GH[GitHub Actions] -- CI --> APP
  GH -- keep-alive --> PG
```

## Front
```mermaid
flowchart TB
  main[main.tsx<br/>QueryClient] --> App[App.tsx<br/>carga · URL ↔ filtros · tema]
  App --> FB[FilterBar]
  App --> V1[Panorama] & V2[Precio y modelo] & V3[Nichos] & V4[Retención]
  App --> CP[ConceptPanel]
  FB --> ST[(store/filters.ts<br/>Zustand)]
  V1 & V2 & V3 & V4 --> EN[lib/engine.ts<br/>filtros + KPIs]
  CP --> EN
  CP --> SB[lib/supabase.ts<br/>RPC en vivo]
  V1 & V2 & V3 & V4 --> EC[EChart.tsx<br/>ECharts 6]
```

| Capa | Archivo | Responsabilidad |
|---|---|---|
| Datos | `lib/dataSource.ts` | Carga del snapshot y conversión a arreglos tipados |
| Cálculo | `lib/engine.ts`, `lib/stats.ts` | Filtros y KPIs con las mismas fórmulas que el SQL |
| Estado | `store/filters.ts` | Filtros globales, vista activa y sincronización con la URL |
| En vivo | `lib/supabase.ts` | Cliente de solo lectura, `rpc_concept_benchmark`, `rpc_health` |
| Visual | `components/`, `features/` | Controles accesibles, tarjetas con vista de tabla, vistas |
