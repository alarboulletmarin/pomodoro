import { expect, test, type Page } from '@playwright/test';

const SESSIONS_KEY = 'pomodoro.sessions.v1';

const scrubber = (page: Page) => page.getByRole('spinbutton');
// The ghost minutes either side of the clock are aria-hidden; the digits are not.
const digits = (page: Page) => page.getByRole('spinbutton').locator('span:not([aria-hidden])');

async function storedSessionCount(page: Page): Promise<number> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return 0;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return 0;
    const entries = (parsed as { entries?: unknown }).entries;
    return Array.isArray(entries) ? entries.length : -1;
  }, SESSIONS_KEY);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Runs on every navigation, so the marker keeps a reload from wiping the app state.
    if (window.sessionStorage.getItem('e2e-reset') === null) {
      window.localStorage.clear();
      // These journeys start after the first visit; first-visit.spec.ts owns that one.
      window.localStorage.setItem('pomodoro.intro.v1', '1');
      window.sessionStorage.setItem('e2e-reset', '1');
    }
  });
  await page.goto('/');
  await expect(scrubber(page)).toBeVisible();
});

test('set 45 min, start, pause, resume, end without logging a session', async ({ page }) => {
  await expect(scrubber(page)).toHaveAttribute('aria-valuenow', '25');
  await expect(digits(page)).toHaveText('25:00');

  await page.getByRole('button', { name: '45 min' }).click();

  await expect(scrubber(page)).toHaveAttribute('aria-valuenow', '45');
  await expect(digits(page)).toHaveText('45:00');

  await page.getByRole('button', { name: 'démarrer', exact: true }).click();

  // Starting collapses the screen: clock, progress bar, two buttons, nothing else.
  await expect(page.getByRole('heading')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '45 min' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'réglages' })).toHaveCount(0);
  await expect(page.getByTestId('progress-fill')).toBeVisible();
  await expect(page.getByRole('button')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'mettre en pause' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'terminer la session' })).toBeVisible();

  await page.getByRole('button', { name: 'mettre en pause' }).click();
  await expect(page.getByRole('button', { name: 'reprendre' })).toBeVisible();

  const frozen = await digits(page).textContent();
  await expect(digits(page)).toHaveText(frozen ?? '', { timeout: 2_000 });
  await page.waitForTimeout(1_200);
  expect(await digits(page).textContent()).toBe(frozen);

  await page.getByRole('button', { name: 'reprendre' }).click();
  await expect(page.getByRole('button', { name: 'mettre en pause' })).toBeVisible();
  await expect(digits(page)).not.toHaveText(frozen ?? '', { timeout: 3_000 });

  await page.getByRole('button', { name: 'terminer la session' }).click();

  await expect(page.getByRole('heading', { name: 'prêt à démarrer' })).toBeVisible();
  await expect(page.getByRole('button', { name: '45 min' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'réglages' })).toBeVisible();
  await expect(digits(page)).toHaveText('45:00');

  expect(await storedSessionCount(page)).toBe(0);
});
