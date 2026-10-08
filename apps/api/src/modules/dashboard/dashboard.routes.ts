import { Router } from 'express';
import { dashboardQuerySchema } from '@stride/shared';
import { getAuth } from '../../middleware/authenticate';
import { parseInput } from '../../lib/validate';
import { getDashboard } from './dashboard.service';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (req, res) => {
  const { today } = parseInput(dashboardQuerySchema, req.query, 'query');
  res.json(await getDashboard(getAuth(req).userId, today));
});
