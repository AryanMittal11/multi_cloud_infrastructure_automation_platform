import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/projects';

export const projectController = {
  /**
   * POST /api/projects
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const project = await projectService.createProject(userId, req.body);
      res.status(201).json({
        message: `Project "${project.name}" successfully created`,
        project,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/projects
   */
  list: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = await projectService.listProjects();
      res.status(200).json({ projects });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/projects/:id
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.status(200).json({ project });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/projects/:id
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const project = await projectService.updateProject(req.params.id, userId, req.body);
      res.status(200).json({
        message: `Project "${project.name}" updated successfully`,
        project,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/projects/:id
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await projectService.deleteProject(req.params.id, userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/projects/:id/environments
   */
  createEnvironment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const environment = await projectService.createEnvironment(req.params.id, req.body);
      res.status(201).json({
        message: `Environment "${environment.name}" successfully created`,
        environment,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/projects/:id/environments/:envId/account
   */
  bindCloudAccount: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cloudAccountId } = req.body;
      if (!cloudAccountId) {
        return res.status(400).json({ error: 'cloudAccountId is required in body' });
      }

      const environment = await projectService.bindCloudAccountToEnvironment(
        req.params.envId,
        cloudAccountId,
      );

      res.status(200).json({
        message: `Cloud account bound to environment "${environment.name}"`,
        environment,
      });
    } catch (err) {
      next(err);
    }
  },
};
