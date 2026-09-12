import { Request, Response, NextFunction } from 'express';
import { cloudService } from '../services/cloud';
import { Provider } from '@prisma/client';

export const cloudController = {
  /**
   * POST /api/cloud-accounts
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const account = await cloudService.createCloudAccount(userId, req.body);
      res.status(201).json({
        message: `Cloud account "${account.name}" successfully onboarded`,
        cloudAccount: account,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/cloud-accounts
   */
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = req.query.provider as Provider | undefined;
      const projectId = req.query.projectId as string | undefined;

      const accounts = await cloudService.listCloudAccounts({ provider, projectId });
      res.status(200).json({ cloudAccounts: accounts });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/cloud-accounts/:id
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await cloudService.getCloudAccountById(req.params.id);
      if (!account) {
        return res.status(404).json({ error: 'Cloud account not found' });
      }
      res.status(200).json({ cloudAccount: account });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/cloud-accounts/:id
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await cloudService.deleteCloudAccount(req.params.id, userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
