/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Node 22+ has its own localStorage global, which hides jsdom's in tests.
// Turn it off where the flag exists; older Node versions would reject it.
const nodeWebStorageOff = process.allowedNodeEnvironmentFlags.has('--experimental-webstorage')
  ? ['--no-experimental-webstorage']
  : []

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    execArgv: nodeWebStorageOff,
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
