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
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = await projectService.listProjects(req.user!.userId, req.user!.role);
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
      const role = req.user!.role;
      const project = await projectService.updateProject(req.params.id, userId, role, req.body);
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
      const role = req.user!.role;
      const result = await projectService.deleteProject(req.params.id, userId, role);
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
      // cloudAccountId: null (or absent) unbinds; a non-null id is required otherwise.
      if (cloudAccountId !== null && cloudAccountId !== undefined && typeof cloudAccountId !== 'string') {
        return res.status(400).json({ error: 'cloudAccountId must be a string or null' });
      }

      const environment = await projectService.bindCloudAccountToEnvironment(
        req.params.envId,
        cloudAccountId ?? null,
      );

      res.status(200).json({
        message:
          cloudAccountId == null
            ? `Cloud account unbound from environment "${environment.name}"`
            : `Cloud account bound to environment "${environment.name}"`,
        environment,
      });
    } catch (err) {
      next(err);
    }
  },
};
