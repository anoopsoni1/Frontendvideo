import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from "vite-plugin-pwa";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss(),
       VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Nexo one-to-one videocall',
        short_name: 'Nexo',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0ea5e9',
        icons: [
          { src: 'https://cdn-icons-png.freepik.com/512/8224/8224096.png', sizes: '192x192', type: 'image/png' },
          { src: 'https://cdn-icons-png.freepik.com/512/8224/8224096.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
})
