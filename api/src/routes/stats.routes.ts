import { Router } from 'express';
import { getStats } from '../controllers/stats.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';

const router = Router();

router.get('/', authenticate, requireAdmin, getStats);

export default router;
