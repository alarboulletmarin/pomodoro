import { expect, test } from '@playwright/test';

const BLUE_DARK = '#7FA9FF';
const BLUE_DARK_RGB = 'rgb(127, 169, 255)';

test.use({ colorScheme: 'light' });

test('theme, accent and language survive a reload', async ({ page }) => {
  await page.addInitScript(() => {
    // Runs on every navigation, so the marker keeps the reload from wiping what was set.
    if (window.sessionStorage.getItem('e2e-reset') === null) {
      window.localStorage.clear();
      // These journeys start after the first visit; first-visit.spec.ts owns that one.
      window.localStorage.setItem('pomodoro.intro.v1', '1');
      window.sessionStorage.setItem('e2e-reset', '1');
    }
  });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('heading', { name: 'prêt à démarrer' })).toBeVisible();

  await page.getByRole('button', { name: 'réglages' }).click();
  const settings = page.getByRole('region', { name: 'réglages' });
  await expect(settings).toBeVisible();

  await settings.getByRole('button', { name: 'sombre' }).click();
  await settings.getByRole('button', { name: 'bleu', exact: true }).click();
  await settings.getByRole('button', { name: 'anglais' }).click();

  // The pane relabels itself the moment the locale changes.
  await expect(page.getByRole('region', { name: 'settings' })).toBeVisible();

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  );
  expect(accent.toUpperCase()).toBe(BLUE_DARK);

  const start = page.getByRole('button', { name: 'start', exact: true });
  await expect(start).toBeVisible();
  await expect(start).toHaveCSS('background-color', BLUE_DARK_RGB);

  await expect(page.getByRole('heading', { name: 'ready to start' })).toBeVisible();
  await expect(page.getByText('pick a length, then start')).toBeVisible();
});
