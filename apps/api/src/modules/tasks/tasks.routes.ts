import { Router } from 'express';
import {
  idParamSchema,
  taskCreateSchema,
  taskListQuerySchema,
  taskUpdateSchema,
} from '@stride/shared';
import { getAuth } from '../../middleware/authenticate';
import { parseInput } from '../../lib/validate';
import * as tasks from './tasks.service';

// Mounted behind requireAuth; ownership is enforced in the service through the parent project.
export const tasksRouter = Router();

tasksRouter.get('/', async (req, res) => {
  const query = parseInput(taskListQuerySchema, req.query, 'query');
  res.json(await tasks.listTasks(getAuth(req).userId, query));
});

tasksRouter.get('/:id', async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params, 'params');
  res.json({ task: await tasks.getTask(getAuth(req).userId, id) });
});

tasksRouter.post('/', async (req, res) => {
  const input = parseInput(taskCreateSchema, req.body, 'body');
  res.status(201).json({ task: await tasks.createTask(getAuth(req).userId, input) });
});

tasksRouter.put('/:id', async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params, 'params');
  const input = parseInput(taskUpdateSchema, req.body, 'body');
  res.json({ task: await tasks.updateTask(getAuth(req).userId, id, input) });
});

tasksRouter.delete('/:id', async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params, 'params');
  await tasks.deleteTask(getAuth(req).userId, id);
  res.status(204).end();
});
