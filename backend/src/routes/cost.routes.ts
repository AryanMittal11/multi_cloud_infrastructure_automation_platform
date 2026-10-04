import { Router } from 'express';
import { costController } from '../controllers/cost.controller';
import { authenticateToken, requireDeveloper } from '../middleware';

export const costRouter = Router();

// All cost routes require authentication
costRouter.use(authenticateToken);

// Pre-deployment estimate: template + configuration + provider + region
costRouter.post('/estimate', requireDeveloper, costController.estimate);

// Monthly rollup across active deployments, optionally per project
costRouter.get('/summary', requireDeveloper, costController.summary);

// Heuristic optimization recommendations + projected spend
costRouter.get('/optimizations', requireDeveloper, costController.optimizations);

// Multi-cloud cost comparison for a given workload profile
costRouter.get('/compare', requireDeveloper, costController.multiCloudCompare);

// Scaling & traffic cost projection
costRouter.get('/scaling', requireDeveloper, costController.scalingAnalysis);

// 12-month cost trend projection
costRouter.get('/trends', requireDeveloper, costController.trendProjection);

// Rightsizing recommendations
costRouter.get('/rightsizing', requireDeveloper, costController.rightsizing);

// Provider-specific optimization tips
costRouter.get('/tips', requireDeveloper, costController.tips);

// Available workload profiles for comparison tools
costRouter.get('/workload-profiles', requireDeveloper, costController.workloadProfiles);

// Savings plan options for a given provider
costRouter.get('/savings-plans', requireDeveloper, costController.savingsPlans);
