import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { authenticateToken, requireViewer } from '../middleware';

export const auditRouter = Router();

// Protect all audit routes with JWT authentication
auditRouter.use(authenticateToken);

// List audit logs matching optional filters
auditRouter.get('/', requireViewer, auditController.list);
