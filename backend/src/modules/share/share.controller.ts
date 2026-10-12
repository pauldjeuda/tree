import { Request, Response, NextFunction } from 'express';
import { Family } from '../../db/models/Family.js';
import { generateShareId } from '../../utils/tokens.js';
import { env } from '../../config/env.js';
import { UpdateShareDto } from '../../shared/index.js';

export class ShareController {
  public async getOrCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const familyId = req.params.familyId || req.params.id;
      const family = await Family.findByPk(familyId);
      if (!family) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Famille introuvable',
          },
        });
      }

      if (!family.share_id) {
        family.share_id = generateShareId();
        family.share_active = true;
      }
      await family.save();

      return res.json({
        shareId: family.share_id,
        url: `${env.PUBLIC_APP_URL}/f/${family.share_id}`,
        active: family.share_active,
      });
    } catch (err) {
      next(err);
    }
  }

  public async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const familyId = req.params.familyId || req.params.id;
      const { active } = req.body as UpdateShareDto;
      const family = await Family.findByPk(familyId);
      if (!family) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Famille introuvable',
          },
        });
      }

      if (!active && !family.share_id) {
        return res.json({ shareId: null, url: null, active: false });
      }
      if (!family.share_id) {
        family.share_id = generateShareId();
      }
      family.share_active = active;
      await family.save();

      return res.json({
        shareId: family.share_id,
        url: `${env.PUBLIC_APP_URL}/f/${family.share_id}`,
        active: family.share_active,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const shareController = new ShareController();
