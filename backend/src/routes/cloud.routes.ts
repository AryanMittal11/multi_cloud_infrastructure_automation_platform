import { Router } from 'express';
import { z } from 'zod';
import { Provider } from '@prisma/client';
import { cloudController } from '../controllers/cloud.controller';
import {
  authenticateToken,
  requireAdmin,
  requireDeveloper,
  requireDestructivePermission,
  validateBody,
} from '../middleware';

export const cloudRouter = Router();

// Validation schema for cloud account onboarding
const createCloudAccountSchema = z.object({
  name: z.string().min(2, 'Cloud account name must be at least 2 characters'),
  provider: z.nativeEnum(Provider),
  credentials: z.record(z.any()),
  accountReference: z.string().optional(),
  projectId: z.string().uuid().optional(),
  skipValidation: z.boolean().optional(),
});

// Cloud account routes
cloudRouter.use(authenticateToken);

cloudRouter.post(
  '/',
  requireDeveloper,
  validateBody(createCloudAccountSchema),
  cloudController.create,
);

cloudRouter.get('/', requireDeveloper, cloudController.list);
cloudRouter.get('/:id', requireDeveloper, cloudController.getById);

cloudRouter.delete(
  '/:id',
  requireDeveloper,
  requireDestructivePermission({ expectedKeyword: 'CONFIRM_DELETE_ACCOUNT' }),
  cloudController.delete,
);
