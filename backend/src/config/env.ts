import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DB_DIALECT: z.enum(['mysql', 'sqlite']).default('sqlite'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().default('tree_db'),
  DB_USER: z.string().default('tree_user'),
  DB_PASSWORD: z.string().default('tree_password'),
  DB_SSL: bool.default('false'),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(10).default(3),
  DB_STORAGE: z.string().default('./data/tree.sqlite'),
  /** Origines autorisées pour les appels navigateur, séparées par des virgules. */
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PUBLIC_APP_URL: z.string().default('http://localhost:5173'),
  /** URL publique de l'API (vide en local : le front passe par le proxy Vite). */
  PUBLIC_API_URL: z.string().default(''),
  UPLOAD_DIR: z.string().default('./uploads'),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  /** Nombre de proxys de confiance devant l'API (0 en local, 1 derrière nginx ou un PaaS). */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  /** Applique les migrations en attente au démarrage (pratique en développement). */
  AUTO_MIGRATE: bool.optional(),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Erreur de configuration d'environnement :", parsed.error.format());
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  CORS_ORIGINS: raw.CORS_ORIGIN.split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  PUBLIC_APP_URL: raw.PUBLIC_APP_URL.replace(/\/+$/, ''),
  PUBLIC_API_URL: raw.PUBLIC_API_URL.replace(/\/+$/, ''),
  UPLOAD_DIR_ABS: path.resolve(raw.UPLOAD_DIR),
  AUTO_MIGRATE: raw.AUTO_MIGRATE ?? raw.NODE_ENV !== 'production',
};

/**
 * En production, une configuration oubliée ferait « marcher » l'application avec des valeurs de
 * développement (liens de partage vers localhost, CORS fermé…). On préfère échouer au démarrage,
 * avec un message qui dit exactement quoi corriger.
 */
if (env.NODE_ENV === 'production') {
  const problems: string[] = [];
  const isLocal = (url: string) => /localhost|127\.0\.0\.1/.test(url);
  if (!process.env.PUBLIC_APP_URL || isLocal(env.PUBLIC_APP_URL)) {
    problems.push("PUBLIC_APP_URL doit être l'adresse publique du site (ex. https://tree.exemple.com).");
  }
  if (!process.env.CORS_ORIGIN || env.CORS_ORIGINS.some(isLocal)) {
    problems.push("CORS_ORIGIN doit être l'adresse publique du site (ex. https://tree.exemple.com).");
  }
  if (env.DB_DIALECT === 'mysql' && (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'tree_password')) {
    problems.push('DB_PASSWORD doit être défini avec un mot de passe fort (pas la valeur par défaut).');
  }
  if (process.env.VERCEL === '1' && !env.BLOB_READ_WRITE_TOKEN) {
    problems.push('BLOB_READ_WRITE_TOKEN doit être défini sur Vercel pour stocker les photos durablement.');
  }
  if (problems.length) {
    console.error('[Config] Configuration de production incomplète :\n - ' + problems.join('\n - '));
    process.exit(1);
  }
}

if (env.NODE_ENV === 'production' && env.DB_DIALECT === 'sqlite') {
  console.warn(
    '[Config] SQLite en production : prévu pour le développement. Utilisez MySQL (DB_DIALECT=mysql).',
  );
}
