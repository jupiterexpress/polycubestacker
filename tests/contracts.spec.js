import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('asterra-opening-complete','1');
    localStorage.setItem('polycube-tutorial-complete','1');
  });
  await page.goto('/');
});

test('three contracts can be built with the real placement physics and progress in order', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.evaluate(() => { STACKER.CFG.seed = 37; });
  for (let index=0; index<3; index++) {
    await expect(page.locator('#contractKicker')).toContainText(`${index+1} OF 3`);
    await page.locator('#contractAccept').click();
    const result = await page.evaluate(() => {
      const G = STACKER, C = G.Contract, S = G.S;
      const key = cells => cells.map(c => c.join(',')).sort().join('|');
      let attempts = 0;
      while (S.phase !== 'over' && S.phase !== 'finishing' && attempts++ < C.plan.tiles) {
        G.step(60,1/60,true);
        const p = S.piece; if (!p) break;
        let best = null;
        for (let stance=0; stance<p.stances.length; stance++) {
          for (let spin=0; spin<4; spin++) {
            for (const [x,z] of C.plan.columns) {
              if (!p.cells.every(c => G.World.has(x+c[0],-1,z+c[2]))) continue;
              const y = G.Physics.findLanding(p.cells,x,z);
              if (y === null || !G.Physics.evaluate(p.cells,x,y,z).stable) continue;
              let gain=0, outside=0;
              for (const c of p.cells) { if (C.plan.keys.has([x+c[0],y+c[1],z+c[2]].join(','))) gain++; else outside++; }
              const score=gain*20-outside*12-y;
              if (!best || score>best.score) best={x,z,score,key:key(p.cells)};
            }
            G.rotate();
          }
          G.tip();
        }
        if (!best || best.score<0) {
          if (C.ready()) { C.finishRequested=true; G.step(1,1/60,true); break; }
          G.place(); G.step(160,1/60,true); continue;
        }
        let aligned=false;
        for (let stance=0; stance<p.stances.length && !aligned; stance++) {
          for (let spin=0; spin<4; spin++) { if (key(p.cells)===best.key) { aligned=true; break; } G.rotate(); }
          if (!aligned) G.tip();
        }
        p.axis='x'; p.cross=best.z; p.t=best.x;
        G.place(); G.step(150,1/60,true);
        if (C.ready() && C.filled()/C.plan.cells.length>=.85) { C.finishRequested=true; G.step(1,1/60,true); }
      }
      G.step(240,1/60,true);
      const cells=C.cells(), result=C.result;
      const before=C.coins; C.showResults();
      return { result, phase:S.phase, filled:C.filled(), placed:S.placed, attempts,
        sameCells: C.building && key(cells)===key([...C.building.keys].map(k => k.split(',').map(Number))),
        sourceHidden: S.pieces.every(p => !p.root.visible), doublePaid:C.coins!==before,
        groups: C.building?.shell.geometry.groups.length };
    });
    expect(result.result?.complete, JSON.stringify(result)).toBe(true);
    expect(result.sameCells).toBe(true);
    expect(result.sourceHidden).toBe(true);
    expect(result.doublePaid).toBe(false);
    expect(result.groups).toBe(2);
    await expect(page.locator('#endGrid')).toContainText('DENSITY GRADE');
    await page.screenshot({ path: `/tmp/asterra-contract-${index+1}.png` });
    await page.locator('#nextContract').click();
  }
  await expect(page.locator('#districtDone')).toBeVisible();
  await expect(page.locator('#districtBuildings > div')).toHaveCount(3);
  await page.reload();
  await expect(page.locator('#districtDone')).toBeVisible();
  expect(errors).toEqual([]);
});

test('completion reveals bottom to top, then pays by density; failed builds cannot unlock contracts', async ({ page }) => {
  await page.locator('#contractAccept').click();
  const failure = await page.evaluate(() => { const G=STACKER; G.Contract.end('strikes'); return { coins:G.Contract.coins, next:G.Contract.nextIndex }; });
  expect(failure).toEqual({ coins:0, next:0 });
  await expect(page.locator('#nextContract')).toBeHidden();
  await page.locator('#againBtn').click();
  const r = await page.evaluate(() => {
    const G=STACKER, C=G.Contract;
    // Nonuniform player silhouette, including one over-height cell and two interior omissions.
    C.plan.cells.filter((c,i)=>i!==14 && i!==18).forEach(c=>G.World.add(...c,'test'));
    G.World.add(-1,2,0,'test'); G.S.perfects=999;
    C.end('complete');
    const coinsBefore=C.coins, earlyPlane=C.building.shell.material[0].clippingPlanes[0].constant;
    C.tick(1);
    const laterPlane=C.building.shell.material[0].clippingPlanes[0].constant;
    const expectedKeys=[...G.World.occ.keys()].filter(k=>Number(k.split(',')[1])>=0).sort();
    C.tick(4);
    return { coinsBefore, earlyPlane, laterPlane, keys:[...C.building.keys].sort(), expectedKeys, reward:C.result.reward, grade:C.result.grade };
  });
  expect(r.coinsBefore).toBe(0); expect(r.laterPlane).toBeGreaterThan(r.earlyPlane);
  expect(r.keys).toEqual(r.expectedKeys); expect(r.grade).toBe('A'); expect(r.reward).toBe(164);
  await expect(page.locator('#endSub')).not.toContainText('÷');
  await page.reload();
  await expect(page.locator('#contractKicker')).toContainText('2 OF 3');
});

test('mobile controls meet touch sizes and the two complex plans have real open lots', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.locator('#contractAccept').click();
  for (const id of ['tipBtn','rotBtn','turnBtn','placeBtn','powerBtn','pauseBtn']) {
    const box=await page.locator('#'+id).boundingBox(); expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x+box.width).toBeLessThanOrEqual(320);
  }
  const masks=await page.evaluate(()=>{
    const G=STACKER, out=[]; G.Contract.nextIndex=2;
    for(const index of [1,2]) { G.Contract.brief(index); G.Contract.start(); out.push({ area:G.CFG.baseplate.w*G.CFG.baseplate.d, base:[...G.World.occ.keys()].length, target:G.Contract.plan.cells.length }); }
    return out;
  });
  expect(masks[0].base).toBeLessThan(masks[0].area); expect(masks[1].base).toBeLessThan(masks[1].area);
  expect(masks[1].target).toBeGreaterThan(masks[0].target);
});
