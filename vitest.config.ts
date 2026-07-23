import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'https://example.com',
      },
    },
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ['./tests/setupLocalStorage.ts'],
  },
})
