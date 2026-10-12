import express from 'express';
import cors from 'cors';
import helmetModule from 'helmet';
import type { RequestHandler } from 'express';
import { env } from './config/env.js';
import './db/models/index.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { familiesRoutes } from './modules/families/families.routes.js';
import { personsRoutes } from './modules/persons/persons.routes.js';
import { shareRoutes } from './modules/share/share.routes.js';
import { publicRoutes } from './modules/public/public.routes.js';
import { storageService } from './services/storage.service.js';
import { sequelize } from './db/index.js';

// Import direct pour que le traceur de dépendances Vercel embarque le middleware.
const helmet = helmetModule as unknown as () => RequestHandler;

export interface CreateAppOptions {
  corsOrigins?: string[];
  trustProxy?: number;
}

export function createApp(options: CreateAppOptions = {}) {
  const allowedOrigins = new Set(options.corsOrigins ?? env.CORS_ORIGINS);
  const app = express();

  // Derrière nginx ou un hébergeur, sans cela la limitation de débit s'applique à l'IP du proxy
  // (un seul quota pour tous les utilisateurs).
  app.set('trust proxy', options.trustProxy ?? env.TRUST_PROXY);

  app.use(helmet());

  // Liste blanche stricte : seules les origines configurées reçoivent les en-têtes CORS.
  // Aucun cookie n'est utilisé (le jeton passe par l'en-tête Authorization), donc pas de credentials.
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );

  // Photos : noms aléatoires, donc cache long et immuable. Servies avant le limiteur général,
  // car une seule page d'arbre charge de nombreuses images.
  if (!storageService.usesBlob) {
    app.use(
      '/api/v1/uploads',
      express.static(storageService.directory, {
        index: false,
        dotfiles: 'deny',
        maxAge: '365d',
        immutable: true,
        setHeaders: (res) => {
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // export PNG depuis un autre domaine
        },
      }),
    );
  }

  app.use(generalLimiter);
  app.use(express.json({ limit: '100kb' }));

  // Contrôle de disponibilité (Docker, hébergeur) : vérifie aussi que la base répond.
  app.get('/api/v1/health', async (_req, res) => {
    try {
      await sequelize.authenticate();
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ error: { code: 'INTERNAL_ERROR', message: 'Base de données indisponible.' } });
    }
  });

  app.use('/api/v1/families', familiesRoutes);
  app.use('/api/v1/families/:familyId/persons', personsRoutes);
  app.use('/api/v1/families/:familyId/share', shareRoutes);
  app.use('/api/v1/public', publicRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
