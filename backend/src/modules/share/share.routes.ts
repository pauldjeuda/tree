import { Router } from 'express';
import { shareController } from './share.controller.js';
import { requireEditAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { UpdateShareSchema } from '../../shared/index.js';

const router = Router({ mergeParams: true });

router.post(
  '/',
  requireEditAuth,
  shareController.getOrCreate.bind(shareController)
);

router.patch(
  '/',
  requireEditAuth,
  validateBody(UpdateShareSchema),
  shareController.updateStatus.bind(shareController)
);

export const shareRoutes = router;
