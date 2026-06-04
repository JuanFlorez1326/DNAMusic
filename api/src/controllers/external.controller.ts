import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

interface DummyUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
}

export async function importFromDummyJson(req: Request, res: Response): Promise<void> {
  const { sedeId, limit = 5 } = req.body as { sedeId: string; limit?: number };
  const take = Math.min(Number(limit), 20);

  const sede = await prisma.sede.findUnique({ where: { id: sedeId } });
  if (!sede) {
    res.status(400).json({ message: 'La sede especificada no existe' });
    return;
  }

  const url = `https://dummyjson.com/users?limit=${take}&select=id,firstName,lastName,email,phone,username`;
  const response = await fetch(url);

  if (!response.ok) {
    res.status(502).json({ message: 'Error al contactar la API externa' });
    return;
  }

  const data = (await response.json()) as { users: DummyUser[] };

  let imported = 0;
  let skipped = 0;

  for (const u of data.users) {
    const email = u.email.toLowerCase();
    const documento = `EXT-${u.id}`;

    const exists =
      (await prisma.estudiante.findUnique({ where: { email } })) ||
      (await prisma.estudiante.findUnique({ where: { documento } }));

    if (exists) {
      skipped++;
      continue;
    }

    await prisma.estudiante.create({
      data: {
        nombreCompleto: `${u.firstName} ${u.lastName}`,
        email,
        telefono: u.phone.slice(0, 20),
        documento,
        sedeId,
        programa: 'Importado — Por definir',
        estado: 'ACTIVO',
      },
    });
    imported++;
  }

  logger.info({ imported, skipped, sedeId }, 'DummyJSON import completed');
  res.status(201).json({ imported, skipped, message: `${imported} estudiantes importados, ${skipped} omitidos (ya existían)` });
}
