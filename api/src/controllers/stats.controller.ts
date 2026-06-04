import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function getStats(_req: Request, res: Response): Promise<void> {
  const [porSede, porEstado, sedeConMasActivos] = await Promise.all([
    prisma.$queryRaw<{ sedeId: string; total: bigint }[]>`
      SELECT "sedeId", COUNT(*) as total
      FROM estudiantes
      GROUP BY "sedeId"
    `,
    prisma.$queryRaw<{ estado: string; total: bigint }[]>`
      SELECT estado, COUNT(*) as total
      FROM estudiantes
      GROUP BY estado
    `,
    prisma.$queryRaw<{ sedeId: string; total: bigint }[]>`
      SELECT "sedeId", COUNT(*) as total
      FROM estudiantes
      WHERE estado = 'ACTIVO'
      GROUP BY "sedeId"
      ORDER BY total DESC
      LIMIT 1
    `,
  ]);

  const sedeIds = [...new Set(porSede.map((r) => r.sedeId))];
  const sedes = await prisma.sede.findMany({
    where: { id: { in: sedeIds } },
    select: { id: true, nombre: true, ciudad: true },
  });
  const sedeMap = new Map(sedes.map((s) => [s.id, s]));

  const totalPorSede = porSede.map((r) => ({
    sede: sedeMap.get(r.sedeId) ?? { id: r.sedeId, nombre: 'Desconocida', ciudad: '' },
    total: Number(r.total),
  }));

  const totalPorEstado = porEstado.map((r) => ({
    estado: r.estado,
    total: Number(r.total),
  }));

  const topSede =
    sedeConMasActivos.length > 0
      ? {
          sede: sedeMap.get(sedeConMasActivos[0]!.sedeId) ?? null,
          totalActivos: Number(sedeConMasActivos[0]!.total),
        }
      : null;

  res.json({ totalPorSede, totalPorEstado, sedeConMasActivos: topSede });
}
