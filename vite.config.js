import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

<<<<<<< HEAD
export default defineConfig({
  plugins: [react()],
                            // 'base: "./"' ensures the app looks for files relative to index.html
                            // This works on Vercel (/) AND GitHub Pages (/recipe-matcher/)
                            base: './',
                            build: {
                              outDir: 'dist',
                              assetsDir: 'assets',
                            }
=======
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use './' (relative path) to ensure assets load correctly on BOTH Vercel (root) and GitHub Pages (subpath)
  base: './', 
>>>>>>> 3ab5ade22411e9f5449c5d3a44c64fc082043afe
})
