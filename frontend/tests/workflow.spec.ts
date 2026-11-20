import { test, expect, Page } from '@playwright/test';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('DemoPassword!2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your requests' })).toBeVisible();
}
async function call(page: Page, path: string, method = 'GET', data?: object) {
  return page.evaluate(
    async ({ path, method, data }) => {
      const token = document.cookie
        .split('; ')
        .find((c) => c.startsWith('XSRF-TOKEN='))
        ?.slice(11);
      const res = await fetch('http://localhost:8000/api' + path, {
        method,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      return { status: res.status, body: await res.json() };
    },
    { path, method, data },
  );
}

test('CSRF recovery never submits the create form without a new user decision', async ({
  page,
  context,
}) => {
  await login(page, 'alex@example.test');
  await page.goto('/requests/new');
  const title = 'CSRF recovery ' + Date.now();
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page
    .getByLabel('Description', { exact: true })
    .fill('A request created only after an explicit second submission.');
  await context.clearCookies({ name: 'XSRF-TOKEN' });
  let submissions = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url() === 'http://localhost:8000/api/requests')
      submissions++;
  });
  const rejected = page.waitForResponse(
    (response) =>
      response.url() === 'http://localhost:8000/api/requests' &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Create request', exact: true }).click();
  expect((await rejected).status()).toBe(419);
  await page.getByRole('button', { name: 'Reinitialize security token' }).click();
  await expect(
    page.getByText('Security token refreshed. Review the form before submitting again.'),
  ).toBeVisible();
  expect(submissions).toBe(1);
  expect((await call(page, '/requests?search=' + encodeURIComponent(title))).body.meta.total).toBe(
    0,
  );
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(title);
  await page.getByRole('button', { name: 'Create request', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  expect(submissions).toBe(2);
  expect((await call(page, '/requests?search=' + encodeURIComponent(title))).body.meta.total).toBe(
    1,
  );
});

test('status failures display field errors and the transition reason without replay', async ({
  page,
}) => {
  await login(page, 'sam@example.test');
  const created = await call(page, '/requests', 'POST', {
    title: 'Status errors ' + Date.now(),
    description: 'Verify actionable errors without changing the request.',
    priority: 'LOW',
  });
  const id = created.body.data.id;
  await page.goto('/requests/' + id);
  let attempts = 0;
  // Deliberately invalid payloads exercise real Laravel validation and workflow errors.
  await page.route('**/api/requests/' + id + '/status', (route) => {
    attempts++;
    const body = route.request().postDataJSON();
    return route.continue({
      postData: JSON.stringify(
        attempts === 1 ? { ...body, remark: 'x'.repeat(501) } : { ...body, status: 'RESOLVED' },
      ),
    });
  });
  await page.getByRole('button', { name: 'Mark in progress' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('remark:');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('500');
  await page.getByRole('button', { name: 'Mark in progress' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'This status change is not allowed.' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark in progress' })).toBeEnabled();
  expect(attempts).toBe(2);
  expect((await call(page, '/requests/' + id)).body.data.version).toBe(1);
  expect((await call(page, '/requests/' + id + '/history')).body.data).toHaveLength(0);
});
test('owned workflow, literal XSS text, two-tab stale recovery and both users', async ({
  page,
  context,
  browser,
}) => {
  const title = 'Browser check ' + Date.now();
  let dialogs = 0;
  page.on('dialog', async (dialog) => {
    dialogs++;
    await dialog.dismiss();
  });
  await login(page, 'alex@example.test');
  await page.getByRole('link', { name: 'New request', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill(title);
  const xss = '<img src=x onerror=alert(1)>';
  await page.getByLabel('Description', { exact: true }).fill(xss);
  await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('HIGH');
  await page.screenshot({ path: '../docs/screenshots/create.png', fullPage: true });
  await page.getByRole('button', { name: 'Create request', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.getByText(xss, { exact: true })).toBeVisible();
  expect(await page.locator('main img').count()).toBe(0);
  expect(dialogs).toBe(0);
  const detailUrl = page.url();
  const id = detailUrl.split('/').pop()!;
  const second = await context.newPage();
  await second.goto(detailUrl);
  await expect(second.getByRole('button', { name: 'Mark in progress' })).toBeEnabled();
  await second.getByLabel('Remark (optional)').fill('Preserve this remark');
  await page.getByLabel('Remark (optional)').fill(xss);
  await page.getByRole('button', { name: 'Mark in progress' }).click();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
  // Fail the stale recovery GETs, but let the PATCH reach Laravel.
  await second.route('**/api/requests/' + id, (route) => route.abort());
  await second.route('**/api/requests/' + id + '/history', (route) => route.abort());
  await second.getByRole('button', { name: 'Mark in progress' }).click();
  await expect(second.getByText(/This request changed in another tab/)).toBeVisible();
  await expect(second.getByRole('button', { name: 'Mark in progress' })).toBeDisabled();
  await expect(second.getByLabel('Remark (optional)')).toHaveValue('Preserve this remark');
  await second.unrouteAll();
  await second.getByRole('button', { name: 'Refresh details' }).click();
  await expect(second.getByText('Version 2', { exact: true })).toBeVisible();
  expect((await call(page, '/requests/' + id + '/history')).body.data).toHaveLength(1);
  await expect(second.getByRole('button', { name: 'Mark resolved' })).toBeEnabled();
  await second.getByRole('button', { name: 'Mark resolved' }).click();
  await expect(second.getByRole('heading', { name: 'Request resolved' })).toBeVisible();
  expect((await call(page, '/requests/' + id + '/history')).body.data).toHaveLength(2);
  await second.screenshot({ path: '../docs/screenshots/detail-history.png', fullPage: true });
  await page.goto(
    '/requests?search=' + encodeURIComponent(title) + '&status=RESOLVED&priority=HIGH',
  );
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  await page.screenshot({ path: '../docs/screenshots/list.png', fullPage: true });
  const other = await browser.newContext();
  const sam = await other.newPage();
  await login(sam, 'sam@example.test');
  for (const suffix of ['', '/history'])
    expect((await call(sam, '/requests/' + id + suffix)).status).toBe(404);
  expect(
    (
      await call(sam, '/requests/' + id + '/status', 'PATCH', {
        status: 'IN_PROGRESS',
        expected_version: 1,
      })
    ).status,
  ).toBe(404);
  await sam.goto(detailUrl);
  await expect(sam.getByText('Request not found.', { exact: true })).toBeVisible();
  await expect(sam.getByText(xss, { exact: true })).toHaveCount(0);
  await sam.goto('/requests/new');
  await sam.getByLabel('Title', { exact: true }).fill('Sam browser check ' + Date.now());
  await sam.getByLabel('Description', { exact: true }).fill('A separate request belonging to Sam.');
  await sam.getByRole('button', { name: 'Create request', exact: true }).click();
  await sam.getByRole('button', { name: 'Mark in progress' }).click();
  await expect(sam.getByRole('button', { name: 'Mark resolved' })).toBeEnabled();
  await sam.getByRole('button', { name: 'Mark resolved' }).click();
  await expect(sam.getByRole('heading', { name: 'Request resolved' })).toBeVisible();
  await other.close();
});

test('combined filters, pagination, empty result, network retry and mobile layout', async ({
  page,
}) => {
  await login(page, 'alex@example.test');
  const title = 'Pagination ' + Date.now();
  for (let i = 0; i < 11; i++)
    expect(
      (
        await call(page, '/requests', 'POST', {
          title: title + ' ' + i,
          description: 'Browser pagination fixture.',
          priority: 'LOW',
        })
      ).status,
    ).toBe(201);
  await page.goto('/requests');
  await page.getByLabel('Search title').fill(title);
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('OPEN');
  await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('LOW');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('11 requests found')).toBeVisible();
  await page.getByRole('link', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  expect(await page.locator('.request-list li').count()).toBe(1);
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('RESOLVED');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('No requests match these filters.')).toBeVisible();
  expect(page.url()).not.toContain('page=2');
  await page.route('**/api/requests?*', (route) => route.abort());
  await page.goto('/requests');
  await expect(page.getByRole('button', { name: 'Retry list' })).toBeVisible();
  await page.unrouteAll();
  await page.getByRole('button', { name: 'Retry list' }).click();
  await expect(page.locator('.request-list')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/requests/new');
  await expect(page.getByLabel('Title', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: '../docs/screenshots/mobile-create.png', fullPage: true });
});
