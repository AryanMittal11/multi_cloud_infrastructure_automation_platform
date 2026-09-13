import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';

export const authRouter = Router();

// Zod schemas for auth endpoints
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(Role).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

// Authentication endpoints
authRouter.post('/register', validateBody(registerSchema), authController.register);
authRouter.post('/login', validateBody(loginSchema), authController.login);
authRouter.post('/refresh', validateBody(refreshSchema), authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', authenticateToken, authController.me);
