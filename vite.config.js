import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
base: "/recipe-matcher/"
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
