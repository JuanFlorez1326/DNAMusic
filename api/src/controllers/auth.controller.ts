import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { RegisterInput, LoginInput } from '../schemas/auth.schema';

const SALT_ROUNDS = 12;
const DUMMY_HASH = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbQK9Dq.q';

export async function register(req: Request, res: Response): Promise<void> {
  const { nombre, email, password, role, sedeId } = req.body as RegisterInput;

  if (role === 'OPERADOR' && !sedeId) {
    res.status(400).json({ message: 'Un OPERADOR debe tener una sede asignada' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: 'Ya existe un usuario con ese email' });
    return;
  }

  if (sedeId) {
    const sede = await prisma.sede.findUnique({ where: { id: sedeId } });
    if (!sede) {
      res.status(400).json({ message: 'La sede especificada no existe' });
      return;
    }
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { nombre, email, password: hashed, role, sedeId: sedeId ?? null },
    select: { id: true, nombre: true, email: true, role: true, sedeId: true, createdAt: true },
  });

  res.status(201).json({ message: 'Usuario creado exitosamente', user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });

  const hashToCompare = user ? user.password : DUMMY_HASH;
  const passwordMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordMatch) {
    res.status(401).json({ message: 'Credenciales inválidas' });
    return;
  }

  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '8h';

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      sedeId: user.sedeId,
    },
    secret,
    { expiresIn } as jwt.SignOptions,
  );

  res.json({
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      sedeId: user.sedeId,
    },
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, nombre: true, email: true, role: true, sedeId: true, sede: true },
  });

  if (!user) {
    res.status(404).json({ message: 'Usuario no encontrado' });
    return;
  }

  res.json(user);
}
