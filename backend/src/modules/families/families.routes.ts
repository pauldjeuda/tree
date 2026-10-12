import { Router } from 'express';
import { familiesController } from './families.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { requireEditAuth } from '../../middleware/auth.js';
import { createFamilyLimiter } from '../../middleware/rateLimit.js';
import { CreateFamilySchema, UpdateFamilySchema } from '../../shared/index.js';

const router = Router();

router.post(
  '/',
  createFamilyLimiter,
  validateBody(CreateFamilySchema),
  familiesController.create.bind(familiesController)
);

router.get(
  '/:id',
  requireEditAuth,
  familiesController.getOne.bind(familiesController)
);

router.patch(
  '/:id',
  requireEditAuth,
  validateBody(UpdateFamilySchema),
  familiesController.update.bind(familiesController)
);

export const familiesRoutes = router;
