import { Request, Response, NextFunction } from 'express';
import { ShareIdSchema } from '../../shared/index.js';
import { Family } from '../../db/models/Family.js';
import { relationsService } from '../../services/relations.service.js';

export class PublicController {
  public async getSharedTree(req: Request, res: Response, next: NextFunction) {
    try {
      const { shareId } = req.params;

      const parsed = ShareIdSchema.safeParse(shareId);
      const family = parsed.success ? await Family.findOne({ where: { share_id: parsed.data } }) : null;

      if (!family) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Arbre généalogique introuvable ou lien incorrect',
          },
        });
      }

      if (!family.share_active) {
        return res.status(410).json({
          error: {
            code: 'SHARE_INACTIVE',
            message: 'Le propriétaire a désactivé ce lien de partage.',
          },
        });
      }

      const snapshot = await relationsService.getSnapshot(family.id, undefined, { publicView: true });

      res.set('Cache-Control', 'no-store');
      res.set('X-Robots-Tag', 'noindex, nofollow');
      return res.json(snapshot);
    } catch (err) {
      next(err);
    }
  }
}

export const publicController = new PublicController();
