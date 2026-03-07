import { defineConfig } from 'vitest/config'
import solidPlugin from 'vite-plugin-solid'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    solidPlugin(),
  ],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000',
      },
    },
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // SolidJS needs special transform handling
    deps: {
      optimizer: {
        web: {
          include: [],
        },
      },
    },
  },
  resolve: {
    conditions: ['development', 'browser'],
  },
})
