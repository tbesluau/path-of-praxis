import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { version } from './package.json'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main:           resolve(__dirname, 'index.html'),
        'privacy-policy': resolve(__dirname, 'privacy-policy.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
})
