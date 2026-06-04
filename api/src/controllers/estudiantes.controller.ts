import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CreateEstudianteInput, UpdateEstudianteInput } from '../schemas/estudiante.schema';
import { EstadoEstudiante } from '@prisma/client';

export async function getEstudiantes(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const sedeId = req.query['sedeId'] as string | undefined;
  const estado = req.query['estado'] as EstadoEstudiante | undefined;
  const pageQ = req.query['page'] as string | undefined;
  const limitQ = req.query['limit'] as string | undefined;
  const search = req.query['search'] as string | undefined;

  const take = Math.min(Number(limitQ) || 20, 100);
  const skip = (Math.max(Number(pageQ) || 1, 1) - 1) * take;
  const page = Math.max(Number(pageQ) || 1, 1);

  const effectiveSedeId = user.role === 'OPERADOR' ? user.sedeId! : sedeId;

  const where: Record<string, unknown> = {};
  if (effectiveSedeId) where['sedeId'] = effectiveSedeId;
  if (estado) where['estado'] = estado;
  if (search) {
    where['OR'] = [
      { nombreCompleto: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { documento: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, estudiantes] = await prisma.$transaction([
    prisma.estudiante.count({ where }),
    prisma.estudiante.findMany({
      where,
      include: { sede: { select: { id: true, nombre: true, ciudad: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  res.json({
    data: estudiantes,
    meta: { total, page, limit: take, pages: Math.ceil(total / take) },
  });
}

export async function getEstudianteById(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const user = req.user!;

  const estudiante = await prisma.estudiante.findUnique({
    where: { id },
    include: { sede: { select: { id: true, nombre: true, ciudad: true } } },
  });

  if (!estudiante) {
    res.status(404).json({ message: 'Estudiante no encontrado' });
    return;
  }

  if (user.role === 'OPERADOR' && estudiante.sedeId !== user.sedeId) {
    res.status(403).json({ message: 'No tienes acceso a este estudiante' });
    return;
  }

  res.json(estudiante);
}

export async function createEstudiante(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const data = req.body as CreateEstudianteInput;

  if (user.role === 'OPERADOR' && data.sedeId !== user.sedeId) {
    res.status(403).json({ message: 'Solo puedes crear estudiantes en tu sede' });
    return;
  }

  const sede = await prisma.sede.findUnique({ where: { id: data.sedeId } });
  if (!sede) {
    res.status(400).json({ message: 'La sede especificada no existe' });
    return;
  }

  const emailExists = await prisma.estudiante.findUnique({ where: { email: data.email } });
  if (emailExists) {
    res.status(409).json({ message: 'Ya existe un estudiante con ese email' });
    return;
  }

  const docExists = await prisma.estudiante.findUnique({ where: { documento: data.documento } });
  if (docExists) {
    res.status(409).json({ message: 'Ya existe un estudiante con ese documento' });
    return;
  }

  const estudiante = await prisma.estudiante.create({
    data: {
      ...data,
      estado: data.estado as EstadoEstudiante,
      fechaInscripcion: data.fechaInscripcion ? new Date(data.fechaInscripcion) : new Date(),
    },
    include: { sede: { select: { id: true, nombre: true, ciudad: true } } },
  });

  res.status(201).json(estudiante);
}

export async function updateEstudiante(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const user = req.user!;
  const data = req.body as UpdateEstudianteInput;

  const existing = await prisma.estudiante.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: 'Estudiante no encontrado' });
    return;
  }

  if (user.role === 'OPERADOR' && existing.sedeId !== user.sedeId) {
    res.status(403).json({ message: 'No tienes acceso a este estudiante' });
    return;
  }

  if (data.sedeId && user.role === 'OPERADOR' && data.sedeId !== user.sedeId) {
    res.status(403).json({ message: 'No puedes mover un estudiante a otra sede' });
    return;
  }

  const estudiante = await prisma.estudiante.update({
    where: { id },
    data: {
      ...data,
      estado: data.estado as EstadoEstudiante | undefined,
      fechaInscripcion: data.fechaInscripcion ? new Date(data.fechaInscripcion) : undefined,
    },
    include: { sede: { select: { id: true, nombre: true, ciudad: true } } },
  });

  res.json(estudiante);
}

export async function deleteEstudiante(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const user = req.user!;

  const existing = await prisma.estudiante.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: 'Estudiante no encontrado' });
    return;
  }

  if (user.role === 'OPERADOR' && existing.sedeId !== user.sedeId) {
    res.status(403).json({ message: 'No tienes acceso a este estudiante' });
    return;
  }

  await prisma.estudiante.delete({ where: { id } });
  res.status(204).send();
}
