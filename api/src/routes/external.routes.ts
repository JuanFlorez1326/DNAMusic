import { Router } from 'express';
import { importFromDummyJson } from '../controllers/external.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';

const router = Router();

router.post('/import', authenticate, requireAdmin, importFromDummyJson);

export default router;
