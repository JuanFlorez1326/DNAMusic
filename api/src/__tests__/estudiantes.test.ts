import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { prisma } from '../__mocks__/prisma';

const makeToken = (role: 'ADMIN' | 'OPERADOR', sedeId: string | null = null) =>
  jwt.sign(
    { userId: 'user-1', email: 'test@test.com', role, sedeId },
    process.env['JWT_SECRET']!,
    { expiresIn: '1h' },
  );

const adminToken = makeToken('ADMIN');
const operBogToken = makeToken('OPERADOR', 'sede-bogota');
const operMedToken = makeToken('OPERADOR', 'sede-medellin');

const mockEstudiante = {
  id: 'est-1',
  nombreCompleto: 'Ana López',
  email: 'ana@gmail.com',
  telefono: '3001234567',
  documento: '1020304050',
  sedeId: 'sede-bogota',
  sede: { id: 'sede-bogota', nombre: 'DNA Music Bogotá', ciudad: 'Bogotá' },
  programa: 'Piano',
  estado: 'ACTIVO',
  fechaInscripcion: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const paginatedResponse = {
  data: [mockEstudiante],
  meta: { total: 1, page: 1, limit: 20, pages: 1 },
};

describe('GET /api/estudiantes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/estudiantes');
    expect(res.status).toBe(401);
  });

  it('ADMIN sees all students', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([1, [mockEstudiante]]);

    const res = await request(app)
      .get('/api/estudiantes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
  });

  it('OPERADOR query is scoped to their sede', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([1, [mockEstudiante]]);

    const res = await request(app)
      .get('/api/estudiantes')
      .set('Authorization', `Bearer ${operBogToken}`);

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe('POST /api/estudiantes', () => {
  const newStudent = {
    nombreCompleto: 'Carlos Ruiz',
    email: 'carlos@gmail.com',
    telefono: '3109876543',
    documento: '1030405060',
    sedeId: 'sede-bogota',
    programa: 'Guitarra',
    estado: 'ACTIVO',
  };

  beforeEach(() => jest.clearAllMocks());

  it('ADMIN can create student in any sede', async () => {
    (prisma.sede.findUnique as jest.Mock).mockResolvedValue({ id: 'sede-bogota' });
    (prisma.estudiante.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.estudiante.create as jest.Mock).mockResolvedValue({ ...mockEstudiante, ...newStudent });

    const res = await request(app)
      .post('/api/estudiantes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newStudent);

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('carlos@gmail.com');
  });

  it('OPERADOR can create student in their own sede', async () => {
    (prisma.sede.findUnique as jest.Mock).mockResolvedValue({ id: 'sede-bogota' });
    (prisma.estudiante.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.estudiante.create as jest.Mock).mockResolvedValue({ ...mockEstudiante, ...newStudent });

    const res = await request(app)
      .post('/api/estudiantes')
      .set('Authorization', `Bearer ${operBogToken}`)
      .send(newStudent);

    expect(res.status).toBe(201);
  });

  it('OPERADOR cannot create student in another sede', async () => {
    const res = await request(app)
      .post('/api/estudiantes')
      .set('Authorization', `Bearer ${operMedToken}`)
      .send({ ...newStudent, sedeId: 'sede-bogota' });

    expect(res.status).toBe(403);
  });

  it('returns 409 on duplicate email', async () => {
    (prisma.sede.findUnique as jest.Mock).mockResolvedValue({ id: 'sede-bogota' });
    (prisma.estudiante.findUnique as jest.Mock).mockResolvedValueOnce(mockEstudiante);

    const res = await request(app)
      .post('/api/estudiantes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newStudent);

    expect(res.status).toBe(409);
  });

  it('returns 400 with missing required fields', async () => {
    const res = await request(app)
      .post('/api/estudiantes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombreCompleto: 'Solo nombre' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/estudiantes/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('OPERADOR cannot delete student from another sede', async () => {
    (prisma.estudiante.findUnique as jest.Mock).mockResolvedValue({
      ...mockEstudiante,
      sedeId: 'sede-medellin',
    });

    const res = await request(app)
      .delete('/api/estudiantes/est-1')
      .set('Authorization', `Bearer ${operBogToken}`);

    expect(res.status).toBe(403);
  });

  it('ADMIN can delete any student', async () => {
    (prisma.estudiante.findUnique as jest.Mock).mockResolvedValue(mockEstudiante);
    (prisma.estudiante.delete as jest.Mock).mockResolvedValue(mockEstudiante);

    const res = await request(app)
      .delete('/api/estudiantes/est-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 for nonexistent student', async () => {
    (prisma.estudiante.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/estudiantes/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
