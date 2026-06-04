import { Router } from 'express';
import {
  getEstudiantes,
  getEstudianteById,
  createEstudiante,
  updateEstudiante,
  deleteEstudiante,
} from '../controllers/estudiantes.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createEstudianteSchema, updateEstudianteSchema } from '../schemas/estudiante.schema';

const router = Router();

router.use(authenticate);

router.get('/', getEstudiantes);
router.get('/:id', getEstudianteById);
router.post('/', validate(createEstudianteSchema), createEstudiante);
router.put('/:id', validate(updateEstudianteSchema), updateEstudiante);
router.delete('/:id', deleteEstudiante);

export default router;
