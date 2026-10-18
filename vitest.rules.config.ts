import { defineConfig } from 'vitest/config';

// Pruebas de las reglas de Firestore. Se ejecutan con el emulador encendido:
//   npm run test:reglas
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
