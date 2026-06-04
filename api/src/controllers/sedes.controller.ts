import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CreateSedeInput, UpdateSedeInput } from '../schemas/sede.schema';

export async function getSedes(_req: Request, res: Response): Promise<void> {
  const sedes = await prisma.sede.findMany({
    orderBy: { nombre: 'asc' },
    include: { _count: { select: { estudiantes: true } } },
  });
  res.json(sedes);
}

export async function getSedeById(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const sede = await prisma.sede.findUnique({
    where: { id },
    include: { _count: { select: { estudiantes: true } } },
  });

  if (!sede) {
    res.status(404).json({ message: 'Sede no encontrada' });
    return;
  }

  res.json(sede);
}

export async function createSede(req: Request, res: Response): Promise<void> {
  const data = req.body as CreateSedeInput;
  const sede = await prisma.sede.create({ data });
  res.status(201).json(sede);
}

export async function updateSede(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const data = req.body as UpdateSedeInput;

  const existing = await prisma.sede.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: 'Sede no encontrada' });
    return;
  }

  const sede = await prisma.sede.update({ where: { id }, data });
  res.json(sede);
}

export async function deleteSede(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  const existing = await prisma.sede.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: 'Sede no encontrada' });
    return;
  }

  const hasStudents = await prisma.estudiante.count({ where: { sedeId: id } });
  if (hasStudents > 0) {
    res.status(409).json({
      message: 'No se puede eliminar una sede con estudiantes registrados',
    });
    return;
  }

  await prisma.sede.delete({ where: { id } });
  res.status(204).send();
}
