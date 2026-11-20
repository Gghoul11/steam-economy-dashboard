import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // ECharts pesa ~1 MB: chunk propio para cachearlo entre despliegues
        manualChunks: (id: string) => (id.includes('node_modules/echarts') || id.includes('node_modules/zrender') ? 'echarts' : undefined),
      },
    },
  },
})
