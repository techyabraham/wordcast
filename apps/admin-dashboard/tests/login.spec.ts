import { test, expect } from '@playwright/test';
import { installAdminApiMocks } from './support/mock-admin-api';

test.beforeEach(async ({ page }) => {
  await installAdminApiMocks(page);
});

test('login page renders desktop admin form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Staff Operations' })).toBeVisible();
  await expect(page.getByText('Email')).toBeVisible();
  await expect(page.getByText('Sign in with a staff or admin account')).toBeVisible();
});
