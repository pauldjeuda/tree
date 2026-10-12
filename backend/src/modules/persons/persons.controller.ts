import { Request, Response, NextFunction } from 'express';
import { Person } from '../../db/models/Person.js';
import { relationsService, toPersonDto } from '../../services/relations.service.js';
import { imagesService } from '../../services/images.service.js';
import { storageService } from '../../services/storage.service.js';
import { CreatePersonDto, UpdatePersonDto } from '../../shared/index.js';
import crypto from 'crypto';

export class PersonsController {
  public async create(req: Request, res: Response, next: NextFunction) {
    try {
      const familyId = req.params.familyId;
      const dto = req.body as CreatePersonDto;
      const snapshot = await relationsService.createPersonWithRelation(familyId, dto);
      return res.status(201).json(snapshot);
    } catch (err) {
      next(err);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { familyId, personId } = req.params;
      const dto = req.body as UpdatePersonDto;
      const snapshot = await relationsService.updatePerson(familyId, personId, dto);
      return res.json(snapshot);
    } catch (err) {
      next(err);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { familyId, personId } = req.params;
      const snapshot = await relationsService.deletePerson(familyId, personId);
      return res.json(snapshot);
    } catch (err) {
      next(err);
    }
  }

  public async uploadPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const { familyId, personId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Aucune photo reçue. Envoyez le fichier dans le champ « photo ».',
          },
        });
      }

      const person = await Person.findOne({
        where: { id: personId, family_id: familyId },
      });

      if (!person) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Membre introuvable',
          },
        });
      }

      // Process image
      const processedBuffer = await imagesService.processAvatar(file.buffer);
      const filename = `${crypto.randomBytes(16).toString('hex')}.webp`;
      const photoReference = await storageService.saveFile(filename, processedBuffer);

      const previous = person.photo_path;
      person.photo_path = photoReference; // nom local ou URL durable Vercel Blob
      await person.save();
      await storageService.deleteFile(previous);

      return res.json(toPersonDto(person));
    } catch (err) {
      next(err);
    }
  }

  public async deletePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const { familyId, personId } = req.params;
      const person = await Person.findOne({
        where: { id: personId, family_id: familyId },
      });

      if (!person) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Membre introuvable',
          },
        });
      }

      if (person.photo_path) {
        const previous = person.photo_path;
        person.photo_path = null;
        await person.save();
        await storageService.deleteFile(previous);
      }

      return res.json(toPersonDto(person));
    } catch (err) {
      next(err);
    }
  }
}

export const personsController = new PersonsController();
