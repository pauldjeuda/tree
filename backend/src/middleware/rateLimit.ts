import { createRequire } from 'node:module';
import type { RequestHandler } from 'express';
import { RelationsError } from '../services/relations.service.js';

const standardResponse = (message: string) => ({ error: { code: 'RATE_LIMITED', message } });

type RateLimitOptions = {
  windowMs: number;
  limit: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  message: { error: { code: string; message: string } };
};

const rateLimit = createRequire(import.meta.url)('express-rate-limit') as (
  options: RateLimitOptions,
) => RequestHandler;

export function makeLimiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: standardResponse(message),
  });
}

// Les limiteurs sont désactivés pendant les tests automatisés (sauf ceux qui les testent explicitement).
const skipInTest = process.env.NODE_ENV === 'test';
const passthrough = (_req: unknown, _res: unknown, next: () => void) => next();

const build = (windowMs: number, max: number, message: string) =>
  skipInTest ? passthrough : makeLimiter(windowMs, max, message);

export const generalLimiter = build(15 * 60 * 1000, 300, 'Trop de requêtes envoyées. Veuillez réessayer dans quelques minutes.');
export const createFamilyLimiter = build(60 * 60 * 1000, 10, 'Limite de création de familles atteinte pour cette heure (10 max).');
export const photoUploadLimiter = build(60 * 60 * 1000, 30, "Limite d'envoi de photos atteinte pour cette heure (30 max).");
export const publicReadLimiter = build(60 * 1000, 120, 'Trop de consultations publiques, veuillez ralentir.');

export { RelationsError };
