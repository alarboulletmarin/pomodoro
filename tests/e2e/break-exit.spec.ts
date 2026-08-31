import { expect, test, type Page } from '@playwright/test';

const TIMER_KEY = 'pomodoro.timer.v1';
const INTRO_KEY = 'pomodoro.intro.v1';

type Phase = 'idle' | 'running' | 'paused' | 'finished';
type Mode = 'focus' | 'break';

const digits = (page: Page) => page.getByRole('spinbutton').locator('span:not([aria-hidden])');

/**
 * Opens the app already sitting in one phase. Waiting out a real session would cost the
 * suite a minute per case, and the point here is the way out, not the countdown.
 */
async function open(
  page: Page,
  phase: Phase,
  mode: Mode,
  minutes: number,
  remainingMs = minutes * 60_000,
): Promise<void> {
  await page.addInitScript(
    ({ timerKey, introKey, state }) => {
      window.localStorage.clear();
      window.localStorage.setItem(introKey, '1');
      window.localStorage.setItem(
        timerKey,
        JSON.stringify({
          ...state,
          endsAt: state.phase === 'running' ? Date.now() + 600_000 : null,
        }),
      );
    },
    { timerKey: TIMER_KEY, introKey: INTRO_KEY, state: { phase, mode, minutes, remainingMs } },
  );
  await page.goto('/');
  await expect(page.getByRole('spinbutton')).toBeVisible();
}

test('an armed break is never the only thing left to do', async ({ page }) => {
  await open(page, 'idle', 'break', 15);

  await expect(page.getByRole('heading', { name: 'temps de pause' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'démarrer la pause' })).toBeVisible();

  await page.getByRole('button', { name: 'reprendre sans pause' }).click();

  await expect(page.getByRole('heading', { name: 'prêt à démarrer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'démarrer', exact: true })).toBeVisible();
  // The 15 minutes belonged to the break; the session opens on the configured length.
  await expect(digits(page)).toHaveText('25:00');
});

test('a break can be walked out of once it is running', async ({ page }) => {
  await open(page, 'running', 'break', 5, 240_000);

  await page.getByRole('button', { name: 'terminer la pause' }).click();

  await expect(page.getByRole('heading', { name: 'prêt à démarrer' })).toBeVisible();
  await expect(digits(page)).toHaveText('25:00');
});

test('the break offered after a session can be declined', async ({ page }) => {
  await open(page, 'finished', 'focus', 25, 0);

  await expect(page.getByRole('heading', { name: 'session terminée' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'pause de 5 min' })).toBeVisible();

  await page.getByRole('button', { name: 'reprendre sans pause' }).click();

  await expect(page.getByRole('heading', { name: 'prêt à démarrer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'démarrer', exact: true })).toBeVisible();
});

test('escape is the same way out as the quiet button', async ({ page }) => {
  await open(page, 'idle', 'break', 5);

  await page.keyboard.press('Escape');

  await expect(page.getByRole('heading', { name: 'prêt à démarrer' })).toBeVisible();
});

test('the whole round trip: session, break, back to a session', async ({ page }) => {
  await open(page, 'finished', 'focus', 25, 0);

  await page.getByRole('button', { name: 'pause de 5 min' }).click();
  await expect(page.getByRole('heading', { name: 'temps de pause' })).toBeVisible();

  await page.getByRole('button', { name: 'démarrer la pause' }).click();
  await expect(page.getByRole('button', { name: 'mettre en pause' })).toBeVisible();

  await page.getByRole('button', { name: 'terminer la pause' }).click();
  await expect(page.getByRole('heading', { name: 'prêt à démarrer' })).toBeVisible();

  await page.getByRole('button', { name: 'démarrer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'terminer la session' })).toBeVisible();
});
