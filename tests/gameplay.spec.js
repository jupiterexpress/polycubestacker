// Gameplay regression test.
// tests/golden.json holds snapshots of seeded, scripted runs (piece spawned, placed/fell/strike
// counts, meter, Landing Shadow, perfects, cube count and the exact occupied cells after every
// drop). It was recorded from the original single-file prototype. If a change alters gameplay,
// this test fails; if the change is intentional, regenerate the golden file (see README).
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { runScenario, SCENARIOS } = require('./scenario.cjs');
const golden = JSON.parse(readFileSync(new URL('./golden.json', import.meta.url)));

test('seeded movement, placements and physics match the original prototype', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => !!window.STACKER);
  const results = await page.evaluate(
    ({ fn, scenarios }) => { const run = new Function('return ' + fn)(); return scenarios.map(s => ({ name: s.name, runs: run(s) })); },
    { fn: runScenario.toString(), scenarios: SCENARIOS });
  if (process.env.UPDATE_GOLDEN) writeFileSync(new URL('./golden.json', import.meta.url), JSON.stringify(results, null, 0));
  expect(errors).toEqual([]);
  // The new meter intentionally holds its charge instead of banking shadow inventory.
  // Keep the original physics reference; dedicated powerup tests cover the new meter.
  const physicsOnly = data => data.map(s => ({ ...s, runs: s.runs.map(run => run.map(snapshot => {
    if (snapshot.startsWith('end,')) return snapshot;
    const parts = snapshot.split(','); parts.splice(parts.length-7,3); return parts.join(',');
  })) }));
  expect(physicsOnly(results)).toEqual(physicsOnly(golden));
});

test('loads with no network access', async ({ page, context }) => {
  await context.route(/^https?:\/\/(?!localhost)/, route => route.abort());
  const failed = [];
  page.on('requestfailed', r => failed.push(r.url()));
  await page.goto('/');
  await page.waitForFunction(() => !!window.STACKER && document.fonts.status === 'loaded');
  expect(failed).toEqual([]);
  expect(await page.evaluate(() => document.fonts.check("700 20px 'Barlow Condensed'"))).toBe(true);
});
