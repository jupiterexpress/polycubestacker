import { test, expect } from '@playwright/test';

test('first-run practice reveals hints, requires a fit, and starts a fresh build', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => localStorage.setItem('asterra-opening-complete', '1'));
  await page.goto('/');
  await expect(page.locator('#tutorialOverview')).toBeVisible();
  await expect(page.locator('.tutorial-demo')).toHaveCount(4);
  await page.getByRole('button', { name: 'TRY IT' }).click();
  await expect(page.locator('#tutorialChallenge')).toBeVisible();
  await page.getByRole('button', { name: 'Pause (keyboard P or Esc)' }).click();
  await page.getByRole('button', { name: 'RESTART', exact: true }).click();
  await expect(page.locator('#tutorialChallenge')).toBeVisible();
  await expect(page.locator('#tutorialHint')).toBeHidden();

  const result = await page.evaluate(() => {
    const G = window.STACKER, T = G.Tutorial;
    G.place();
    const wrongDropBlocked = G.S.phase === 'aim' && G.S.pending === 0;
    T.tick(6.1);
    const firstHint = document.getElementById('tutorialHint').textContent;
    T.tick(7);
    const secondHint = document.getElementById('tutorialHint').textContent;
    for (let i = 0; i < 8 && T.stageFor(G.S.piece) === 0; i++) G.tip();
    for (let i = 0; i < 4 && T.stageFor(G.S.piece) === 1; i++) G.rotate();
    const oriented = T.stageFor(G.S.piece) === 2;
    G.S.piece.t = 0; G.turn();
    G.S.piece.t = -1;
    G.step(1, 1 / 60, true);
    const aligned = T.stageFor(G.S.piece) === 4;
    G.place();
    G.step(120, 1 / 60, true);
    return { wrongDropBlocked, firstHint, secondHint, oriented, aligned, mode: T.mode };
  });
  expect(result.wrongDropBlocked).toBe(true);
  expect(result.firstHint).toContain('height');
  expect(result.secondHint).toContain('FLIP');
  expect(result.oriented).toBe(true);
  expect(result.aligned).toBe(true);
  expect(result.mode).toBe('complete');
  await expect(page.locator('#tutorialDone')).toBeVisible();
  await page.getByRole('button', { name: 'VIEW FIRST CONTRACT' }).click();
  await expect(page.locator('#tutorialDone')).toBeHidden();
  await expect(page.locator('#contractBrief')).toBeVisible();
  await page.getByRole('button', { name: 'ACCEPT CONTRACT' }).click();
  await expect(page.locator('#contractHUD')).toBeVisible();
  expect(await page.evaluate(() => ({ mode: STACKER.Tutorial.mode, placed: STACKER.S.placed, seen: localStorage.getItem('polycube-tutorial-complete') })))
    .toEqual({ mode: 'off', placed: 0, seen: '1' });
  await page.reload();
  await expect(page.locator('#tutorialOverview')).toBeHidden();
  await expect(page.locator('#contractBrief')).toBeVisible();
  expect(errors).toEqual([]);
});
