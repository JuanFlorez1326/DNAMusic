import { z } from 'zod';

export const createEstudianteSchema = z.object({
  nombreCompleto: z.string().min(2).max(150),
  email: z.string().email('Email inválido').toLowerCase(),
  telefono: z.string().min(7).max(20),
  documento: z.string().min(5).max(20),
  sedeId: z.string().min(1, 'La sede es requerida'),
  programa: z.string().min(2).max(150),
  estado: z.enum(['ACTIVO', 'INACTIVO', 'RETIRADO']).optional().default('ACTIVO'),
  fechaInscripcion: z.string().datetime().optional(),
});

export const updateEstudianteSchema = createEstudianteSchema.partial();

export const queryEstudianteSchema = z.object({
  sedeId: z.string().optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO', 'RETIRADO']).optional(),
  page: z.string().regex(/^\d+$/).optional().transform(Number),
  limit: z.string().regex(/^\d+$/).optional().transform(Number),
  search: z.string().optional(),
});

export type CreateEstudianteInput = z.infer<typeof createEstudianteSchema>;
export type UpdateEstudianteInput = z.infer<typeof updateEstudianteSchema>;
