import { test, expect } from '@playwright/test';

test('contractor creation and every story chapter lead to the tutorial', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');
  await expect(page.locator('#opening')).toBeVisible();
  await page.locator('#contractorName').fill('   ');
  await page.getByRole('button', { name: 'MAKE IT OFFICIAL' }).click();
  await expect(page.locator('#nameError')).toHaveText('Tell us what to call you.');
  await page.locator('#contractorName').fill('  Pip  ');
  await page.locator('#contractorName').press('Enter');
  await expect(page.locator('#openingTitle')).toHaveText('Welcome, Pip.');
  expect(await page.evaluate(() => STACKER.S.piece)).toBeNull();
  await page.locator('#openingNext').click();
  await expect(page.locator('#openingText')).toHaveText('Asterra was once a thriving city.');
  await page.locator('#openingNext').click();
  await expect(page.locator('#openingText')).toContainText('earthquake');
  await page.locator('#openingNext').click(); // fast tap-through must leave the city in its aftermath
  await expect(page.locator('#openingText')).toContainText('needs to be rebuilt');
  await page.locator('#openingNext').click();
  await expect(page.locator('#openingText')).toContainText('chosen you');
  await page.locator('#openingNext').click();
  await expect(page.locator('#openingText')).toContainText('blueprint');
  await page.locator('#openingNext').click();
  await expect(page.locator('#openingText')).toContainText('more coins');
  await page.locator('#openingNext').click();
  await expect(page.locator('#openingText')).toContainText('counting on you');
  await page.locator('#openingNext').click();
  await expect(page.locator('#opening')).toBeHidden();
  await expect(page.locator('#tutorialOverview')).toBeVisible();
  await page.reload();
  await expect(page.locator('#opening')).toBeHidden();
  await expect(page.locator('#tutorialOverview')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('asterra-contractor'))).toBe('Pip');
  expect(errors).toEqual([]);
});

test('opening works with reduced motion, blocked storage, and a short landscape screen', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error('storage disabled'); };
    Storage.prototype.getItem = () => { throw new Error('storage disabled'); };
  });
  await page.goto('/');
  await page.locator('#contractorName').fill('<Pip>');
  await page.locator('#contractorName').press('Enter');
  await expect(page.locator('#openingTitle')).toHaveText('Welcome, <Pip>.');
  for (let i = 0; i < 8; i++) await page.locator('#openingNext').click();
  await expect(page.locator('#tutorialOverview')).toBeVisible();
});
