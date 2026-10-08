import { Router } from 'express';
import {
  idParamSchema,
  projectCreateSchema,
  projectListQuerySchema,
  projectUpdateSchema,
} from '@stride/shared';
import { getAuth } from '../../middleware/authenticate';
import { parseInput } from '../../lib/validate';
import * as projects from './projects.service';

// Mounted behind requireAuth. Every service call is scoped by the authenticated user's id;
// owner ids from the client are never read (strict schemas reject them).
export const projectsRouter = Router();

projectsRouter.get('/', async (req, res) => {
  const query = parseInput(projectListQuerySchema, req.query, 'query');
  res.json(await projects.listProjects(getAuth(req).userId, query));
});

projectsRouter.get('/:id', async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params, 'params');
  res.json({ project: await projects.getProject(getAuth(req).userId, id) });
});

projectsRouter.post('/', async (req, res) => {
  const input = parseInput(projectCreateSchema, req.body, 'body');
  res.status(201).json({ project: await projects.createProject(getAuth(req).userId, input) });
});

projectsRouter.put('/:id', async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params, 'params');
  const input = parseInput(projectUpdateSchema, req.body, 'body');
  res.json({ project: await projects.updateProject(getAuth(req).userId, id, input) });
});

projectsRouter.delete('/:id', async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params, 'params');
  await projects.deleteProject(getAuth(req).userId, id);
  res.status(204).end();
});
