import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

// Mock Prisma
jest.mock('../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('Auth HTTP Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should validate input and register user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'usr-reg-1',
        name: 'Alice',
        email: 'alice@example.com',
        role: Role.DEVELOPER,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice',
          email: 'alice@example.com',
          password: 'securePassword123!',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('alice@example.com');
      // Verify Set-Cookie header contains refresh token
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 400 on invalid registration payload', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'A', // too short
          email: 'not-an-email',
          password: '123', // too short
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Validation Error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user and return tokens', async () => {
      const password = 'StrongPassword123!';
      const passwordHash = await bcrypt.hash(password, 10);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr-login-ok',
        name: 'Bob',
        email: 'bob@example.com',
        passwordHash,
        role: Role.ADMIN,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bob@example.com',
          password,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.role).toBe(Role.ADMIN);
    });

    it('should return 401 on invalid credentials', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrong-password',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear refresh cookie on logout', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Successfully logged out');
    });
  });
});
