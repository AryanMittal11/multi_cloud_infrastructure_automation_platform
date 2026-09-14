import { Request, Response, NextFunction } from 'express';
import { designService, DesignInput } from '../services/designs';

export const designController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const designs = await designService.listDesigns(req.user!.userId, req.user!.role);
      res.status(200).json({ designs });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const design = await designService.getDesignById(req.params.id, req.user!.userId, req.user!.role);
      res.status(200).json({ design });
    } catch (err) {
      next(err);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const design = await designService.createDesign(req.user!.userId, req.body as DesignInput);
      res.status(201).json({ design });
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const design = await designService.updateDesign(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        req.body as Partial<DesignInput>,
      );
      res.status(200).json({ design });
    } catch (err) {
      next(err);
    }
  },

  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await designService.deleteDesign(req.params.id, req.user!.userId, req.user!.role);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
