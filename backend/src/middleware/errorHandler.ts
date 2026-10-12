import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { RelationsError } from '../services/relations.service.js';

const STATUS: Record<string, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  SHARE_INACTIVE: 410,
  AMBIGUOUS_UNION: 409,
  PARENT_SLOTS_FULL: 409,
  CYCLE_DETECTED: 409,
  LIMIT_REACHED: 409,
  FILE_TOO_LARGE: 413,
  FILE_INVALID: 415,
  RATE_LIMITED: 429,
};

const send = (res: Response, status: number, code: string, message: string, details?: unknown) =>
  res.status(status).json({ error: { code, message, ...(details !== undefined && { details }) } });

/** Route inconnue : réponse JSON au lieu de la page HTML d'Express. */
export function notFoundHandler(_req: Request, res: Response) {
  send(res, 404, 'NOT_FOUND', 'Cette adresse est introuvable.');
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof RelationsError) {
    return send(res, STATUS[err.code] ?? 400, err.code, err.message, err.details);
  }

  if (err instanceof multer.MulterError) {
    return err.code === 'LIMIT_FILE_SIZE'
      ? send(res, 413, 'FILE_TOO_LARGE', 'La photo dépasse 5 Mo. Choisissez une image plus légère.')
      : send(res, 422, 'VALIDATION_ERROR', 'Envoi de fichier invalide : utilisez le champ « photo ».');
  }

  // Erreurs de lecture du corps de la requête (body-parser)
  const type = (err as { type?: string } | null)?.type;
  if (type === 'entity.parse.failed') {
    return send(res, 422, 'VALIDATION_ERROR', "Le corps de la requête n'est pas un JSON valide.");
  }
  if (type === 'entity.too.large') {
    return send(res, 413, 'VALIDATION_ERROR', 'La requête est trop volumineuse.');
  }

  console.error('Erreur non gérée :', err);
  return send(res, 500, 'INTERNAL_ERROR', 'Une erreur est survenue. Réessayez dans un instant.');
}
