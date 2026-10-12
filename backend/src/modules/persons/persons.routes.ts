import { Router } from 'express';
import multer from 'multer';
import { personsController } from './persons.controller.js';
import { validateBody, validateUuidParams } from '../../middleware/validate.js';
import { requireEditAuth } from '../../middleware/auth.js';
import { photoUploadLimiter } from '../../middleware/rateLimit.js';
import { CreatePersonSchema, UpdatePersonSchema, MAX_PHOTO_BYTES } from '../../shared/index.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 0 },
});

const router = Router({ mergeParams: true });

router.post(
  '/',
  requireEditAuth,
  validateBody(CreatePersonSchema),
  personsController.create.bind(personsController)
);

router.patch(
  '/:personId',
  requireEditAuth,
  validateUuidParams('personId'),
  validateBody(UpdatePersonSchema),
  personsController.update.bind(personsController)
);

router.delete(
  '/:personId',
  requireEditAuth,
  validateUuidParams('personId'),
  personsController.delete.bind(personsController)
);

router.post(
  '/:personId/photo',
  requireEditAuth,
  validateUuidParams('personId'),
  photoUploadLimiter,
  upload.single('photo'),
  personsController.uploadPhoto.bind(personsController)
);

router.delete(
  '/:personId/photo',
  requireEditAuth,
  validateUuidParams('personId'),
  personsController.deletePhoto.bind(personsController)
);

export const personsRoutes = router;
