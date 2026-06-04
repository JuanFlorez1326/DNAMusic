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
const operToken = makeToken('OPERADOR', 'sede-bogota');

const mockSede = {
  id: 'sede-bogota',
  nombre: 'DNA Music Bogotá',
  ciudad: 'Bogotá',
  direccion: 'Calle 100',
  activa: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { estudiantes: 2 },
};

describe('GET /api/sedes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/sedes');
    expect(res.status).toBe(401);
  });

  it('returns sedes list for ADMIN', async () => {
    (prisma.sede.findMany as jest.Mock).mockResolvedValue([mockSede]);

    const res = await request(app)
      .get('/api/sedes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].nombre).toBe('DNA Music Bogotá');
  });

  it('returns sedes list for OPERADOR too', async () => {
    (prisma.sede.findMany as jest.Mock).mockResolvedValue([mockSede]);

    const res = await request(app)
      .get('/api/sedes')
      .set('Authorization', `Bearer ${operToken}`);

    expect(res.status).toBe(200);
  });
});

describe('POST /api/sedes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 for OPERADOR', async () => {
    const res = await request(app)
      .post('/api/sedes')
      .set('Authorization', `Bearer ${operToken}`)
      .send({ nombre: 'Nueva', ciudad: 'Cali', direccion: 'Carrera 1' });

    expect(res.status).toBe(403);
  });

  it('creates sede for ADMIN', async () => {
    (prisma.sede.create as jest.Mock).mockResolvedValue({ ...mockSede, id: 'sede-new' });

    const res = await request(app)
      .post('/api/sedes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'DNA Music Pereira', ciudad: 'Pereira', direccion: 'Cra 8 # 19-20' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('returns 400 with missing fields', async () => {
    const res = await request(app)
      .post('/api/sedes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Sin ciudad' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/sedes/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 for OPERADOR', async () => {
    const res = await request(app)
      .delete('/api/sedes/sede-bogota')
      .set('Authorization', `Bearer ${operToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 409 when sede has students', async () => {
    (prisma.sede.findUnique as jest.Mock).mockResolvedValue(mockSede);
    (prisma.estudiante.count as jest.Mock).mockResolvedValue(3);

    const res = await request(app)
      .delete('/api/sedes/sede-bogota')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
  });

  it('deletes sede with no students', async () => {
    (prisma.sede.findUnique as jest.Mock).mockResolvedValue(mockSede);
    (prisma.estudiante.count as jest.Mock).mockResolvedValue(0);
    (prisma.sede.delete as jest.Mock).mockResolvedValue(mockSede);

    const res = await request(app)
      .delete('/api/sedes/sede-bogota')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });
});
