import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';

// Mock Prisma
jest.mock('../../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('Token Operations', () => {
    it('should generate valid access and refresh tokens', () => {
      const payload = {
        userId: 'usr-123',
        email: 'test@example.com',
        role: Role.DEVELOPER,
      };

      // Access private generateTokens via public method indirectly or direct invocation
      const tokens = (authService as any).generateTokens(payload);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();

      const decoded = authService.verifyAccessToken(tokens.accessToken);
      expect(decoded.userId).toBe('usr-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe(Role.DEVELOPER);
    });

    it('should throw when verifying an invalid or tampered access token', () => {
      expect(() => authService.verifyAccessToken('invalid.jwt.token')).toThrow(
        'Invalid or expired access token',
      );
    });
  });

  describe('User Registration', () => {
    it('should successfully register a new user with hashed password and return tokens', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: Role.DEVELOPER,
        createdAt: new Date(),
      });

      const result = await authService.register({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'securePassword123!',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'jane@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.user.email).toBe('jane@example.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should reject registration if email is already taken', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-id',
        email: 'duplicate@example.com',
      });

      await expect(
        authService.register({
          name: 'Duplicate',
          email: 'duplicate@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow('A user with this email already exists');
    });
  });

  describe('User Login', () => {
    it('should successfully authenticate valid credentials', async () => {
      const password = 'CorrectPassword123!';
      const passwordHash = await bcrypt.hash(password, 10);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr-login-1',
        name: 'Valid User',
        email: 'valid@example.com',
        passwordHash,
        role: Role.ADMIN,
        createdAt: new Date(),
      });

      const result = await authService.login({
        email: 'valid@example.com',
        password,
      });

      expect(result.user.role).toBe(Role.ADMIN);
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('should reject login if password does not match', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr-login-2',
        email: 'user@example.com',
        passwordHash,
        role: Role.DEVELOPER,
      });

      await expect(
        authService.login({
          email: 'user@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject login if user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'AnyPassword!',
        }),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('Refresh Token Rotation', () => {
    it('should successfully rotate refresh token and issue new token pair', async () => {
      const payload = { userId: 'usr-refresh-1', email: 'refresh@example.com' };
      const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr-refresh-1',
        email: 'refresh@example.com',
        role: Role.DEVELOPER,
      });

      const newTokens = await authService.rotateRefreshToken(refreshToken);

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid or expired refresh token', async () => {
      await expect(authService.rotateRefreshToken('invalid.token.signature')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });
  });
});
