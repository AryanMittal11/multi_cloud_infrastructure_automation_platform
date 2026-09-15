import { Router } from 'express';
import { z } from 'zod';
import { userController } from '../controllers/user.controller';
import { authenticateToken, requireAdmin, validateBody } from '../middleware';

export const userRouter = Router();

const updateRoleSchema = z.object({
  role: z.enum(['DEVELOPER'], {
    errorMap: () => ({ message: 'Role must be DEVELOPER' }),
  }),
});

// All user management routes require authentication + ADMIN role
userRouter.use(authenticateToken);
userRouter.use(requireAdmin);

// List all platform users
userRouter.get('/', userController.list);

// Get user activity summary
userRouter.get('/:id/activity', userController.getActivity);

// Get a specific user
userRouter.get('/:id', userController.getById);

// Update a user's role
userRouter.patch('/:id/role', validateBody(updateRoleSchema), userController.updateRole);

// Delete a user
userRouter.delete('/:id', userController.delete);
