import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai';

export const aiController = {
  generate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const architecture = await aiService.generateArchitecture(req.body);
      res.status(200).json({ architecture });
    } catch (err) {
      next(err);
    }
  },
};
