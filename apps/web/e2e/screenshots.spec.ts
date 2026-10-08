import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';

// Captures README screenshots from the seeded demo account (pnpm db:seed).
// Opt-in: CAPTURE_SCREENSHOTS=1 pnpm --filter @stride/web test:e2e screenshots
const outDir = path.resolve(import.meta.dirname, '../../../docs/screenshots');

test.skip(!process.env.CAPTURE_SCREENSHOTS, 'Set CAPTURE_SCREENSHOTS=1 to capture README images');

test('capture screens', async ({ page }) => {
  mkdirSync(outDir, { recursive: true });
  const shot = (name: string) => page.screenshot({ path: path.join(outDir, `${name}.png`) });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await shot('web-login');

  await page.getByLabel('Email').fill('ava.demo@stride.test');
  await page.getByLabel('Password', { exact: true }).fill('StrideDemo123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('Active projects').waitFor();
  await page.waitForLoadState('networkidle');
  await shot('web-dashboard');

  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByRole('link', { name: 'Mobile banking redesign' }).waitFor();
  await shot('web-projects');

  await page.getByRole('link', { name: 'Mobile banking redesign' }).click();
  await page
    .getByRole('button', { name: 'Draft payment confirmation states', exact: true })
    .waitFor();
  await shot('web-project-detail');

  await page
    .getByRole('button', { name: 'Draft payment confirmation states', exact: true })
    .click();
  await page.getByRole('dialog', { name: 'Task details' }).waitFor();
  await page.waitForTimeout(300);
  await shot('web-task-drawer');
  await page.keyboard.press('Escape');

  await page.getByRole('link', { name: 'My Tasks' }).click();
  await page
    .getByRole('button', { name: 'Usability test with five participants', exact: true })
    .waitFor();
  await shot('web-my-tasks');

  // Phone width: the sidebar collapses into a drawer and tables drop secondary columns.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByText('Active projects').waitFor();
  await shot('web-phone-dashboard');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('dialog', { name: 'Navigation' }).waitFor();
  await page.waitForTimeout(250);
  await shot('web-phone-nav');
  await page.keyboard.press('Escape');
  await page.goto('/tasks');
  await page
    .getByRole('button', { name: 'Usability test with five participants', exact: true })
    .waitFor();
  await shot('web-phone-tasks');
});
