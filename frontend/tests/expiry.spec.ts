import { test, expect } from '@playwright/test';
test('idle expiry returns to login after a real one-minute session timeout', async ({ page }) => {
  test.skip(process.env.VERIFY_SHORT_EXPIRY !== '1', 'Run only with backend SESSION_LIFETIME=1; restore 120 afterward.');
  test.setTimeout(100000);
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('sam@example.test');
  await page.getByLabel('Password', { exact: true }).fill('DemoPassword!2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your requests' })).toBeVisible();
  await page.waitForTimeout(65000);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
});
