import { Router } from 'express';
import { resourceController } from '../controllers/resource.controller';
import { authenticateToken, requireDeveloper } from '../middleware';

export const resourceRouter = Router();

// Protect all resource routes with JWT authentication
resourceRouter.use(authenticateToken);

// List resources matching filters
resourceRouter.get('/', requireDeveloper, resourceController.list);

// Get specific resource by ID
resourceRouter.get('/:id', requireDeveloper, resourceController.getById);
