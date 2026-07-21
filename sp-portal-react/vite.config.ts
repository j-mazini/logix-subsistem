import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project-page base path: https://<user>.github.io/logix-subsistem/
// https://vite.dev/config/
export default defineConfig({
  base: '/logix-subsistem/',
  plugins: [react()],
})
