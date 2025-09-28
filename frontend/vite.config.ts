import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Relative paths for Electron
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React-bezogene Libraries in separatem Chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Material-UI in separatem Chunk (größte Library)
          'mui-vendor': [
            '@mui/material', 
            '@mui/system', 
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled'
          ],
          
          // Redux/State Management
          'redux-vendor': [
            '@reduxjs/toolkit', 
            'react-redux'
          ],
          
          // Date/Time Libraries
          'date-vendor': [
            'date-fns'
          ],
          
          // DnD und andere spezifische Libraries
          'utils-vendor': [
            'react-dnd',
            'react-dnd-html5-backend'
          ]
        }
      }
    },
    // Erhöhe das Chunk-Size-Limit, um Warnungen zu reduzieren
    chunkSizeWarningLimit: 600
  }
})
