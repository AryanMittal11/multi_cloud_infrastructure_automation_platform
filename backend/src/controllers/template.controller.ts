import { Request, Response, NextFunction } from 'express';
import { templateService } from '../services/templates';
import { Provider } from '@prisma/client';

export const templateController = {
  /**
   * GET /api/templates
   */
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = req.query.provider as Provider | undefined;
      const templates = await templateService.listTemplates({ provider });
      res.status(200).json({ templates });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/templates/:id
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await templateService.getTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.status(200).json({ template });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/templates/:id/validate
   */
  validate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const configuration = req.body.configuration || req.body;
      const result = await templateService.validateConfiguration(req.params.id, configuration);

      if (!result.valid) {
        return res.status(400).json({
          message: 'Template configuration validation failed',
          valid: false,
          errors: result.errors,
        });
      }

      res.status(200).json({
        message: 'Template configuration is valid',
        valid: true,
        sanitizedConfiguration: result.sanitizedConfiguration,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/templates/sync
   */
  sync: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await templateService.syncTemplatesFromDisk();
      res.status(200).json({
        message: `Successfully synchronized ${result.syncedCount} template(s) from disk catalog`,
        syncedCount: result.syncedCount,
        templates: result.templates,
      });
    } catch (err) {
      next(err);
    }
  },
};
