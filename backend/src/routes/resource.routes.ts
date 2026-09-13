import { Router } from 'express';
import { resourceController } from '../controllers/resource.controller';
import { authenticateToken, requireViewer } from '../middleware';

export const resourceRouter = Router();

// Protect all resource routes with JWT authentication
resourceRouter.use(authenticateToken);

// List resources matching filters
resourceRouter.get('/', requireViewer, resourceController.list);

// Get specific resource by ID
resourceRouter.get('/:id', requireViewer, resourceController.getById);
