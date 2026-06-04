import { z } from 'zod';

export const createSedeSchema = z.object({
  nombre: z.string().min(2).max(100),
  ciudad: z.string().min(2).max(100),
  direccion: z.string().min(5).max(200),
  activa: z.boolean().optional().default(true),
});

export const updateSedeSchema = createSedeSchema.partial();

export type CreateSedeInput = z.infer<typeof createSedeSchema>;
export type UpdateSedeInput = z.infer<typeof updateSedeSchema>;
