import { Router } from 'express';
import { publicController } from './public.controller.js';
import { publicReadLimiter } from '../../middleware/rateLimit.js';

const router = Router();

router.get(
  '/f/:shareId',
  publicReadLimiter,
  publicController.getSharedTree.bind(publicController)
);

export const publicRoutes = router;
