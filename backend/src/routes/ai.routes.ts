import { Router } from 'express';
import { z } from 'zod';
import { aiController } from '../controllers/ai.controller';
import { authenticateToken, requireDeveloper, validateBody } from '../middleware';

export const aiRouter = Router();

const generateSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(3000),
  cloudProvider: z.enum(['AWS', 'AZURE', 'GCP', 'MULTI']).optional(),
});

aiRouter.use(authenticateToken);

// Generate architecture design from natural language prompt
aiRouter.post('/generate', requireDeveloper, validateBody(generateSchema), aiController.generate);
