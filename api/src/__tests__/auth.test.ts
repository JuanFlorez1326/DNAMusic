import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../app';
import { prisma } from '../__mocks__/prisma';

const mockAdmin = {
  id: 'user-admin-1',
  nombre: 'Admin',
  email: 'admin@dnamusic.co',
  password: bcrypt.hashSync('Admin123!', 10),
  role: 'ADMIN',
  sedeId: null,
};

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 and token with valid credentials', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@dnamusic.co', password: 'Admin123!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('returns 401 with wrong password', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@dnamusic.co', password: 'WrongPass1!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Credenciales inválidas');
  });

  it('returns 401 when user does not exist (no user enumeration)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'SomePass1!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Credenciales inválidas');
  });

  it('returns 400 with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'Admin123!' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('returns 400 with missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@dnamusic.co' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('returns user profile with valid token', async () => {
    const token = jwt.sign(
      { userId: mockAdmin.id, email: mockAdmin.email, role: mockAdmin.role, sedeId: mockAdmin.sedeId },
      process.env['JWT_SECRET']!,
      { expiresIn: '1h' },
    );

    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockAdmin);
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe('admin@dnamusic.co');
  });
});
