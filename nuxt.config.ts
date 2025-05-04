// https://nuxt.com/docs/api/configuration/nuxt-config
import { alphaTab } from '@coderline/alphatab/vite';

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  
  vite: {
    plugins: [alphaTab()],
    optimizeDeps: {
      exclude: ['@coderline/alphatab']
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            alphatab: ['@coderline/alphatab']
          }
        }
      }
    }
  },
  
  app: {
    head: {
      script: [
        // {
        //   src: '/alphatab-assets/worker/alphaTab.worker.js',
        //   type: 'text/javascript'
        // }
      ]
    }
  },
  
  nitro: {
    publicAssets: [
      {
        dir: 'node_modules/@coderline/alphatab/dist',
        baseURL: '/alphatab-assets'
      }
    ]
  },
  
  css: [
    'vuetify/lib/styles/main.css',
    '@mdi/font/css/materialdesignicons.css',
  ],

  build: {
    transpile: ['vuetify'],
  },
})
