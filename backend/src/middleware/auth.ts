import { Request, Response, NextFunction } from 'express';
import { UuidSchema } from '../shared/index.js';
import { Family } from '../db/models/Family.js';
import { hashToken, verifyToken } from '../utils/tokens.js';
import { RelationsError } from '../services/relations.service.js';

export interface AuthenticatedRequest extends Request {
  family?: Family;
}

// Empreinte factice : le temps de réponse reste le même que la famille existe ou non.
const DUMMY_HASH = hashToken('tree-dummy-token');

const unauthorized = () =>
  new RelationsError('UNAUTHORIZED', "Lien d'édition invalide ou expiré. Ouvrez à nouveau votre lien d'édition.");

/**
 * Vérifie le jeton d'édition (Authorization: Bearer). Famille inconnue, identifiant invalide
 * et jeton erroné donnent exactement la même réponse 401 : impossible de savoir si une famille existe.
 */
export async function requireEditAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const familyId = UuidSchema.safeParse(req.params.familyId || req.params.id);
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!familyId.success || token.length < 20 || token.length > 100) throw unauthorized();

    const family = await Family.findByPk(familyId.data);
    const valid = verifyToken(token, family?.edit_token_hash ?? DUMMY_HASH);
    if (!family || !valid) throw unauthorized();

    req.family = family;
    next();
  } catch (err) {
    next(err);
  }
}
