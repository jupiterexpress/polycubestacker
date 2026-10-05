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

test('contract density counts blueprint space, pays once, and buys building lights', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('asterra-opening-complete', '1');
    localStorage.setItem('polycube-tutorial-complete', '1');
  });
  await page.goto('/');
  await page.locator('#contractAccept').click();
  const result = await page.evaluate(() => {
    const { Contract: C, World, S, step, CFG } = STACKER;
    // A settled 60%-full blueprint, plus a cell above it that must earn no credit.
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) World.add(x, 0, z, 'test');
    for (let x = -2; x <= 1; x++) for (let z = -2; z <= 2; z++) World.add(x, 1, z, 'test');
    World.add(0, 4, 0, 'test');
    S.placed = CFG.run.pieces; S.phase = 'wait'; S.waitT = 0;
    step(50, 1 / 60, true);
    const first = C.coins; C.finish();
    return { filled: C.filled(), coins: C.coins, first };
  });
  expect(result).toEqual({ filled: 45, coins: 63, first: 63 });
  await expect(page.locator('#endTitle')).toHaveText('CONTRACT COMPLETE');
  await page.locator('#finishUpgrade').click();
  await expect(page.locator('#upgradeStatus')).toContainText('Amber lights installed');
  expect(await page.evaluate(() => STACKER.Contract.coins)).toBe(43);
  await page.locator('#againBtn').click();
  await expect(page.locator('#contractHUD')).toBeVisible();
  expect(await page.evaluate(() => STACKER.Contract.filled())).toBe(0);
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
