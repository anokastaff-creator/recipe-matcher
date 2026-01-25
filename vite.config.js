import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
                            // 'base: "./"' ensures the app looks for files relative to index.html
                            // This works on Vercel (/) AND GitHub Pages (/recipe-matcher/)
                            base: './',
                            build: {
                              outDir: 'dist',
                              assetsDir: 'assets',
                            }
})
