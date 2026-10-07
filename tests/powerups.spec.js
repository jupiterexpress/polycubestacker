import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('asterra-opening-complete','1'); localStorage.setItem('polycube-tutorial-complete','1'); });
  await page.goto('/'); await page.locator('#contractAccept').click();
  await page.waitForFunction(() => !!STACKER.S.piece);
});

test('perfects charge a persistent meter; spending a power resets it and never pays coins', async ({ page }) => {
  const r = await page.evaluate(() => {
    const G=STACKER;
    for(let i=0;i<4;i++) {
      if(G.S.piece) { G.scene.remove(G.S.piece.root); G.S.piece.mat.dispose(); }
      G.spawn([[0,0,0]]); G.S.piece.axis='x'; G.S.piece.t=0; G.S.piece.cross=0;
      G.place(); G.step(100,1/60,true);
    }
    return { meter:G.S.meter, max:G.CFG.meter.max, perfects:G.S.perfects, coins:G.Contract.coins };
  });
  expect(r).toEqual({ meter:4, max:4, perfects:4, coins:0 });
  await expect(page.locator('#powerBtn')).toHaveClass(/ready/);
  await page.locator('#powerBtn').click();
  await expect(page.locator('.power-option')).toHaveCount(4);
  const frozen = await page.evaluate(()=>STACKER.S.piece.t);
  await page.waitForTimeout(150);
  expect(await page.evaluate(()=>STACKER.S.piece.t)).toBe(frozen);
  await page.locator('#closePowers').click();
  expect(await page.evaluate(()=>STACKER.S.meter)).toBe(4);
  await page.locator('#powerBtn').click();
  await page.locator('[data-power="shadow"]').click();
  expect(await page.evaluate(()=>({meter:STACKER.S.meter,shadow:STACKER.S.active.shadow,coins:STACKER.Contract.coins}))).toEqual({meter:0,shadow:1,coins:0});
  await page.evaluate(()=>{ STACKER.S.piece.t=0; STACKER.S.piece.cross=0; STACKER.place(); });
  expect(await page.evaluate(()=>STACKER.S.active.shadow)).toBe(0);
});

test('slow and view expire, pause freezes timers, and view restores the previous camera', async ({ page }) => {
  const r=await page.evaluate(()=>{
    const G=STACKER, p=G.S.piece;
    G.S.meter=G.CFG.meter.max; G.usePower('slow');
    p.t=0; p.dir=1; p.lo=-20; p.hi=20;
    G.step(1,.1,true);
    const movement=p.t, expected=G.CFG.move.speed*p.speedMul*.1*.5;
    G.S.meter=G.CFG.meter.max; const original={pitch:G.Cam.goalPitch,zoom:G.Cam.zoom}; G.usePower('view');
    const assisted={pitch:G.Cam.goalPitch,zoom:G.Cam.zoom};
    return {movement,expected,original,assisted};
  });
  expect(r.movement).toBeCloseTo(r.expected,5); expect(r.assisted.pitch).toBeGreaterThan(r.original.pitch);
  await page.locator('#pauseBtn').click();
  const timers=await page.evaluate(()=>({...STACKER.S.active}));
  await page.waitForTimeout(200);
  expect(await page.evaluate(()=>({...STACKER.S.active}))).toEqual(timers);
  await page.locator('#resumeBtn').click();
  const end=await page.evaluate(()=>{ STACKER.step(800,1/60,true); return { slow:STACKER.S.active.slow,view:STACKER.S.active.view,pitch:STACKER.Cam.goalPitch,zoom:STACKER.Cam.zoom,coins:STACKER.Contract.coins }; });
  expect(end).toEqual({slow:0,view:0,...r.original,coins:0});
});

test('Tile Choice offers five distinct options and spawns the next three in chosen order', async ({ page }) => {
  await page.evaluate(()=>STACKER.celebrate());
  await page.locator('#powerBtn').click(); await page.locator('[data-power="choice"]').click();
  await expect(page.locator('.tile-option')).toHaveCount(5);
  await page.locator('[data-tile="3"]').click(); await page.locator('[data-tile="0"]').click(); await page.locator('[data-tile="2"]').click();
  await expect(page.locator('#tileSelection')).toHaveText('1. Square → 2. Domino → 3. Corner');
  const before=await page.evaluate(()=>JSON.stringify(STACKER.S.piece.cells));
  await page.locator('#confirmTiles').click();
  expect(await page.evaluate(()=>JSON.stringify(STACKER.S.piece.cells))).toBe(before);
  expect(await page.evaluate(()=>STACKER.S.meter)).toBe(0);
  const spawned=await page.evaluate(()=>{
    const G=STACKER, out=[];
    for(let i=0;i<3;i++) { G.place(); G.step(140,1/60,true); out.push(G.S.piece?.base.length); }
    return {out,remaining:G.S.tileQueue.length,coins:G.Contract.coins};
  });
  expect(spawned).toEqual({out:[4,2,3],remaining:0,coins:0});
});
