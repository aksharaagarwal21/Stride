import { expect, test, type Page } from '@playwright/test';

// One end-to-end pass through the main flow with a fresh synthetic account:
// register → project/task CRUD → filters and dashboard → logout.

const unique = Date.now();
const user = {
  name: 'Smoke Tester',
  email: `smoke.${unique}@stride.test`,
  password: 'Smoke-test-1234',
};

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function metric(page: Page, label: string) {
  const card = page.locator('section', { has: page.getByText(label, { exact: true }) }).first();
  return card.locator('p.font-display').innerText();
}

test('register, manage a project and its tasks, filter, then log out', async ({ page }) => {
  // Register
  await page.goto('/register');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Full name is required.')).toBeVisible();
  await page.getByLabel('Full name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();

  // Empty dashboard for a new account
  await expect(page.getByRole('heading', { name: /Smoke/ })).toBeVisible();
  await expect(page.getByText('Start with a project')).toBeVisible();
  expect(await metric(page, 'Total Projects')).toBe('0');

  // Create a project
  await page.getByRole('button', { name: 'Create your first project' }).click();
  const projectDialog = page.getByRole('dialog', { name: 'New project' });
  await projectDialog.getByLabel('Project name').fill('Smoke launch plan');
  await projectDialog.getByLabel('Description').fill('Created by the browser smoke test');
  await projectDialog.getByLabel('Status').selectOption('IN_PROGRESS');
  await projectDialog.getByLabel('End date').fill(addDays(30));
  await projectDialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Smoke launch plan' })).toBeVisible();

  // Create two tasks
  for (const [name, priority] of [
    ['Write announcement', 'HIGH'],
    ['Book venue', 'LOW'],
  ] as const) {
    await page.getByRole('button', { name: 'New task' }).first().click();
    const taskDialog = page.getByRole('dialog', { name: 'New task' });
    await taskDialog.getByLabel('Task name').fill(name);
    await taskDialog.getByLabel('Priority').selectOption(priority);
    await taskDialog.getByLabel('Due date').fill(addDays(3));
    await taskDialog.getByRole('button', { name: 'Create task' }).click();
    await expect(taskDialog).toBeHidden();
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }

  // Complete one task (persisted on the server)
  await page.getByRole('button', { name: 'Mark “Write announcement” as completed' }).click();
  await expect(page.getByRole('button', { name: 'Reopen “Write announcement”' })).toBeVisible();

  // Filters: priority + status combine
  await page.getByLabel('Filter by priority').selectOption('LOW');
  await expect(page.getByRole('button', { name: 'Book venue', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Write announcement', exact: true })).toBeHidden();
  await page.getByLabel('Filter by status').selectOption('COMPLETED');
  await expect(page.getByText('No tasks match these filters')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).first().click();

  // Edit a task in the drawer
  await page.getByRole('button', { name: 'Book venue', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Task details' });
  await drawer.getByLabel('Task name').fill('Book the venue');
  await drawer.getByLabel('Status').selectOption('IN_PROGRESS');
  await drawer.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Task saved')).toBeVisible();
  await drawer.getByRole('button', { name: 'Close' }).last().click();
  await expect(page.getByRole('button', { name: 'Book the venue', exact: true })).toBeVisible();

  // Dashboard reflects the server aggregates
  await page.getByRole('link', { name: 'Overview' }).click();
  await expect(page.getByText('Active projects')).toBeVisible();
  expect(await metric(page, 'Total Projects')).toBe('1');
  expect(await metric(page, 'Total Tasks')).toBe('2');
  expect(await metric(page, 'Completed Tasks')).toBe('1');
  expect(await metric(page, 'Pending Tasks')).toBe('0');
  expect(await metric(page, 'Projects In Progress')).toBe('1');

  // Project search distinguishes "no match" from "no projects"
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByLabel('Search projects by name').fill('nothing-like-this');
  await expect(page.getByText('No projects match')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Search projects by name').fill('SMOKE');
  await expect(page.getByRole('link', { name: 'Smoke launch plan' })).toBeVisible();

  // Deep link reload keeps the user on the page
  await page.getByRole('link', { name: 'Smoke launch plan' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Smoke launch plan' })).toBeVisible();

  // Delete the project (and its tasks)
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Delete “Smoke launch plan”?' });
  await expect(confirm.getByText('its 2 tasks')).toBeVisible();
  await confirm.getByRole('button', { name: 'Delete project' }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByText('No projects yet')).toBeVisible();

  // Log out; protected pages then redirect to login
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByText('You have been signed out.')).toBeVisible();
  await page.goto('/projects');
  await expect(page).toHaveURL(/\/login$/);
});
