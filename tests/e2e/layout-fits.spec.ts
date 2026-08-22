import { expect, test, type Page } from '@playwright/test';

// One width per layout, plus the two that used to be clipped: the tablet layout opens
// at 768px but was drawn with columns and gutters that needed about 1100.
const WIDTHS = [360, 390, 768, 834, 1024, 1200, 1440];

async function overflowing(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const element of document.querySelectorAll('*')) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      if (box.left < -0.5 || box.right > window.innerWidth + 0.5) {
        out.push(
          `${element.tagName.toLowerCase()} ${Math.round(box.left)}..${Math.round(box.right)}`,
        );
      }
    }
    return out;
  });
}

test.describe.configure({ mode: 'parallel' });

for (const width of WIDTHS) {
  test(`nothing is cut off at ${width}px`, async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('pomodoro.intro.v1', '1');
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('spinbutton')).toBeVisible();

    expect(await overflowing(page)).toEqual([]);

    await page.getByRole('button', { name: 'réglages' }).click();
    await expect(page.getByRole('heading', { name: 'réglages' })).toBeVisible();

    expect(await overflowing(page)).toEqual([]);
  });
}
