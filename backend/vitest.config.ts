import { defineConfig } from 'vitest/config';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Les tests ne touchent JAMAIS à la base de développement : SQLite en mémoire + dossier d'upload temporaire.
const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-uploads-'));

export default defineConfig({
  test: {
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text', 'html', 'lcov'],
    },
    env: {
      NODE_ENV: 'test',
      DB_DIALECT: 'sqlite',
      DB_STORAGE: ':memory:',
      UPLOAD_DIR: uploadDir,
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
