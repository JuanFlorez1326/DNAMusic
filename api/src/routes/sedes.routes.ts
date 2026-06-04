import { Router } from 'express';
import {
  getSedes,
  getSedeById,
  createSede,
  updateSede,
  deleteSede,
} from '../controllers/sedes.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createSedeSchema, updateSedeSchema } from '../schemas/sede.schema';

const router = Router();

router.use(authenticate);

router.get('/', getSedes);
router.get('/:id', getSedeById);
router.post('/', requireAdmin, validate(createSedeSchema), createSede);
router.put('/:id', requireAdmin, validate(updateSedeSchema), updateSede);
router.delete('/:id', requireAdmin, deleteSede);

export default router;
