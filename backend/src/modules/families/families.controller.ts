import { Request, Response, NextFunction } from 'express';
import { Family } from '../../db/models/Family.js';
import { generateEditToken, hashToken } from '../../utils/tokens.js';
import { relationsService } from '../../services/relations.service.js';
import { CreateFamilyDto, UpdateFamilyDto } from '../../shared/index.js';

export class FamiliesController {
  public async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, subtitle } = req.body as CreateFamilyDto;
      const editToken = generateEditToken();
      const editTokenHash = hashToken(editToken);

      const family = await Family.create({
        name,
        subtitle: subtitle || 'Arbre généalogique',
        edit_token_hash: editTokenHash,
      });

      const snapshot = await relationsService.getSnapshot(family.id);

      return res.status(201).json({
        snapshot,
        editToken,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const familyId = req.params.id;
      const snapshot = await relationsService.getSnapshot(familyId);
      return res.json(snapshot);
    } catch (err) {
      next(err);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction) {
    try {
      const familyId = req.params.id;
      const { name, subtitle } = req.body as UpdateFamilyDto;

      const family = await Family.findByPk(familyId);
      if (!family) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Famille introuvable',
          },
        });
      }

      if (name !== undefined) family.name = name;
      if (subtitle !== undefined) family.subtitle = subtitle;
      await family.save();

      const snapshot = await relationsService.getSnapshot(familyId);
      return res.json(snapshot);
    } catch (err) {
      next(err);
    }
  }
}

export const familiesController = new FamiliesController();
