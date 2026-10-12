import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { UuidSchema } from '../shared/index.js';
import { RelationsError } from '../services/relations.service.js';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body ?? {});
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message ?? 'Données fournies non valides',
            details: error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
          },
        });
      }
      next(error);
    }
  };
}

/** Refuse tout paramètre d'URL qui n'est pas un UUID avant d'interroger la base. */
export function validateUuidParams(...names: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const name of names) {
      if (!UuidSchema.safeParse(req.params[name]).success) {
        return next(new RelationsError('VALIDATION_ERROR', 'Identifiant invalide'));
      }
    }
    next();
  };
}
