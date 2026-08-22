import { expect, test, type Page } from '@playwright/test';

const LEAD_FR = 'Un minuteur de travail qui te laisse partir.';
const LEAD_EN = 'A work timer that lets you leave.';

async function openBlank(page: Page, url = '/'): Promise<void> {
  await page.addInitScript(() => {
    // Runs on every navigation, so the marker keeps a reload from wiping what was set.
    if (window.sessionStorage.getItem('e2e-reset') === null) {
      window.localStorage.clear();
      window.sessionStorage.setItem('e2e-reset', '1');
    }
  });
  await page.goto(url);
}

test('a stranger lands on an explanation, once', async ({ page }) => {
  await openBlank(page);

  await expect(page.getByRole('heading', { name: LEAD_FR, level: 1 })).toBeVisible();
  await expect(page.getByText('Rien ne sort d’ici.')).toBeVisible();
  // The timer is not underneath: nothing to dismiss, one thing to decide.
  await expect(page.getByRole('spinbutton')).toHaveCount(0);

  await page.getByRole('button', { name: 'commencer' }).click();

  await expect(page.getByRole('spinbutton')).toHaveAttribute('aria-valuenow', '25');
  await expect(page.getByRole('heading', { name: 'prêt à démarrer' })).toBeVisible();

  await page.reload();

  await expect(page.getByRole('heading', { name: 'prêt à démarrer' })).toBeVisible();
  await expect(page.getByRole('heading', { name: LEAD_FR })).toHaveCount(0);

  // Still reachable on purpose, for whoever wants to show it to someone else.
  await page.goto('/?intro');
  await expect(page.getByRole('heading', { name: LEAD_FR })).toBeVisible();
});

test.describe('on an English browser', () => {
  test.use({ locale: 'en-GB' });

  test('the same link explains itself in English', async ({ page }) => {
    await openBlank(page);

    await expect(page.getByRole('heading', { name: LEAD_EN, level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'start' })).toBeVisible();
  });
});
