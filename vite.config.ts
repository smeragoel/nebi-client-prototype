import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The desktop preview may assign a port through PORT when 5173 is taken.
  server: { port: Number(process.env.PORT) || 5173 },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
