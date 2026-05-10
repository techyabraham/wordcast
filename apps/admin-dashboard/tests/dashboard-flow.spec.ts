import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { installAdminApiMocks } from './support/mock-admin-api';

const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@wordcast.dev';
const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';

test.beforeEach(async ({ page }) => {
  await installAdminApiMocks(page);
});

const login = async (page: Page) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Staff Operations' })).toBeVisible();
  await page.locator('input[type="email"]').fill(adminEmail);
  await page.locator('input[type="password"]').fill(adminPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
};

test('redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/sermons');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Staff Operations' })).toBeVisible();
});

test('logs in and navigates core dashboard sections', async ({ page }) => {
  await login(page);

  await page.getByRole('link', { name: 'Sermons' }).click();
  await expect(page.getByRole('heading', { name: 'Sermons' })).toBeVisible();

  await page.getByRole('link', { name: 'Upload Jobs' }).click();
  await expect(page.getByRole('heading', { name: 'Upload Jobs' })).toBeVisible();

  await page.getByRole('link', { name: 'Sessions' }).click();
  await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible();
});

test('logout returns to login screen', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Staff Operations' })).toBeVisible();
});
