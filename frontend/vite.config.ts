import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Adresse du backend pour le serveur de développement et `vite preview` (jamais utilisée en production :
  // là, c'est nginx ou VITE_API_URL qui font le lien).
  const target = env.VITE_DEV_API_TARGET || 'http://localhost:4000';
  const proxy = { '/api': { target, changeOrigin: true } };

  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
    test: {
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.d.ts'],
        reporter: ['text', 'html', 'lcov'],
      },
    },
  };
});
