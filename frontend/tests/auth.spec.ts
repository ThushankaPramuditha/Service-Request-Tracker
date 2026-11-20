import { test, expect, Page } from '@playwright/test';

async function call(page: Page, path: string, method = 'GET', body?: object, token = true) {
  return page.evaluate(
    async ({ path, method, body, token }) => {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (body) headers['Content-Type'] = 'application/json';
      if (token) {
        const value = document.cookie
          .split('; ')
          .find((c) => c.startsWith('XSRF-TOKEN='))
          ?.slice(11);
        if (value) headers['X-XSRF-TOKEN'] = decodeURIComponent(value);
      }
      const response = await fetch('http://localhost:8000' + path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers,
        credentials: 'include',
      });
      return {
        status: response.status,
        body: response.status === 204 ? null : await response.json(),
      };
    },
    { path, method, body, token },
  );
}

test('real browser cookies, strict CSRF, rotation, reload and logout invalidation', async ({
  page,
  context,
  browser,
}) => {
  await page.goto('/login');
  await page.screenshot({ path: '../docs/screenshots/login.png', fullPage: true });
  await call(page, '/sanctum/csrf-cookie');
  const before = (await context.cookies()).find(
    (c) => c.name === 'service_request_tracker_session',
  )!;
  const preLoginCookies = await context.cookies();
  expect(before.httpOnly).toBe(true);
  expect(before.sameSite).toBe('Lax');
  expect(before.secure).toBe(false);
  const missing = await call(
    page,
    '/api/auth/login',
    'POST',
    { email: 'alex@example.test', password: 'DemoPassword!2026' },
    false,
  );
  expect(missing.status).toBe(419);
  expect(missing.body.code).toBe('CSRF_TOKEN_MISMATCH');
  await page.getByLabel('Email', { exact: true }).fill('alex@example.test');
  await page.getByLabel('Password', { exact: true }).fill('DemoPassword!2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your requests' })).toBeVisible();
  const loggedInCookies = await context.cookies();
  const session = loggedInCookies.find((c) => c.name === 'service_request_tracker_session')!;
  expect(session.value).not.toBe(before.value);
  const preLogin = await browser.newContext();
  await preLogin.addCookies(preLoginCookies);
  expect(
    (
      await preLogin.request.get('http://localhost:8000/api/auth/me', {
        headers: { Origin: 'http://localhost:3000', Accept: 'application/json' },
      })
    ).status(),
  ).toBe(401);
  await preLogin.close();
  expect(loggedInCookies.find((c) => c.name === 'XSRF-TOKEN')!.httpOnly).toBe(false);
  const visible = await page.evaluate(() => document.cookie);
  expect(visible).toContain('XSRF-TOKEN=');
  expect(visible).not.toContain('service_request_tracker_session=');
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  const rejected = await call(
    page,
    '/api/requests',
    'POST',
    { title: 'Rejected request', description: 'Should never be stored.', priority: 'LOW' },
    false,
  );
  expect(rejected.status).toBe(419);
  const invalid = await context.request.post('http://localhost:8000/api/requests', {
    headers: {
      Origin: 'http://localhost:3000',
      Accept: 'application/json',
      'X-XSRF-TOKEN': 'invalid',
      'Sec-Fetch-Site': 'same-origin',
    },
    data: { title: 'Rejected request', description: 'Must never be stored.', priority: 'LOW' },
  });
  expect(invalid.status()).toBe(419);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your requests' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  const replay = await browser.newContext();
  await replay.addCookies(loggedInCookies);
  const oldSession = await replay.request.get('http://localhost:8000/api/auth/me', {
    headers: { Origin: 'http://localhost:3000', Accept: 'application/json' },
  });
  expect(oldSession.status()).toBe(401);
  await replay.close();
  expect((await call(page, '/api/requests', 'POST', {}, false)).status).toBe(401);
});

test('exact credentialed CORS rejects an unrelated origin', async ({ request }) => {
  const allowed = await request.fetch('http://localhost:8000/api/auth/login', {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,x-xsrf-token',
    },
  });
  expect(allowed.headers()['access-control-allow-origin']).toBe('http://localhost:3000');
  expect(allowed.headers()['access-control-allow-credentials']).toBe('true');
  const denied = await request.fetch('http://localhost:8000/api/auth/login', {
    method: 'OPTIONS',
    headers: { Origin: 'https://unrelated.example', 'Access-Control-Request-Method': 'POST' },
  });
  expect(denied.headers()['access-control-allow-origin']).not.toBe('https://unrelated.example');
  expect(denied.headers()['access-control-allow-origin']).not.toBe('*');
});
