import { expect, test } from '@playwright/test';

// The mechanism this guards: a worker gets registered at all, and the settings
// carry a control that answers. Whether it finds a new version is a matter of
// what is on the server; that the button reports back is a matter of the app.
test('the settings can ask for a new version, and say when there is none', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('pomodoro.intro.v1', '1');
  });
  await page.goto('/');
  await expect(page.getByRole('spinbutton')).toBeVisible();

  const controlled = await page.waitForFunction(
    () => navigator.serviceWorker.controller !== null,
    undefined,
    { timeout: 15_000 },
  );
  expect(await controlled.jsonValue()).toBeTruthy();

  await page.getByRole('button', { name: 'réglages' }).click();
  const check = page.getByRole('button', { name: 'vérifier' });
  await check.scrollIntoViewIfNeeded();
  await expect(check).toBeEnabled();
  await expect(page.getByText(/^version \d/)).toBeVisible();

  await check.click();

  // Nothing was published between the two lines above: the answer is "up to date",
  // and it is the button itself that says so.
  await expect(page.getByRole('button', { name: 'à jour' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Une nouvelle version est prête.')).toHaveCount(0);
});
