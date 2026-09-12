import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AuthResult, AuthTokens, AuthUser, TokenPayload, RefreshTokenPayload } from './auth.types';

export class AuthService {
  /**
   * Registers a new user, hashes the password, and issues initial auth tokens.
   */
  async register(input: {
    name: string;
    email: string;
    password: string;
    role?: Role;
  }): Promise<AuthResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Verify user does not already exist
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      const error: any = new Error('A user with this email already exists');
      error.statusCode = 409;
      throw error;
    }

    // 2. Hash password with bcrypt
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 3. Persist user in database
    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: input.role || Role.DEVELOPER,
      },
    });

    // 4. Generate JWT tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  /**
   * Authenticates user credentials and issues refreshed tokens.
   */
  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // 3. Issue fresh tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  /**
   * Validates a refresh token and generates a rotated token pair.
   */
  async rotateRefreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        const error: any = new Error('User no longer exists');
        error.statusCode = 401;
        throw error;
      }

      // Generate rotated token pair
      return this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
    } catch (err: any) {
      const error: any = new Error('Invalid or expired refresh token');
      error.statusCode = 401;
      throw error;
    }
  }

  /**
   * Verifies an access token and returns its decoded payload.
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch (err: any) {
      const error: any = new Error('Invalid or expired access token');
      error.statusCode = 401;
      throw error;
    }
  }

  /**
   * Retrieves a sanitized user profile by ID.
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  /**
   * Internal helper to sign access and refresh tokens.
   */
  private generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    const refreshPayload: RefreshTokenPayload = {
      userId: payload.userId,
      email: payload.email,
      jti: crypto.randomUUID(),
    };

    const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_EXPIRES_IN,
    };
  }
}

export const authService = new AuthService();
