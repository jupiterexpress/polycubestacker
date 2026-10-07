import * as THREE from 'three';
import { CFG } from './config.js';
import { S } from './state.js';
import { World } from './world.js';
import { scene } from './scene.js';
import { CONTRACTS, voxelSVG } from './blueprints.js';
import { makeBuilding, exterior } from './building.js';
import { AudioFX } from './audio.js';

const $ = id => document.getElementById(id);
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Session still works. */ } };
const guide = new THREE.Group(); scene.add(guide);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const Contract = {
  active: false, paid: false, savedCfg: null, coins: 0, index: 0, nextIndex: 0, completed: [],
  building: null, finishRequested: false, result: null, revealTime: 0,
  get plan() { return CONTRACTS[this.index]; },
  init(api) {
    this.api = api;
    let progress;
    try { progress = JSON.parse(read('asterra-progress-v2')); } catch { /* Older save. */ }
    this.coins = Math.max(0, Number(progress?.coins ?? read('asterra-coins')) || 0);
    this.nextIndex = Math.max(0, Math.min(3, Math.floor(Number(progress?.nextIndex) || 0)));
    this.completed = Array.isArray(progress?.completed) ? progress.completed.slice(0,3) : [];
    $('contractAccept').addEventListener('click', () => this.start());
    $('finishBuild').addEventListener('click', () => { if (this.ready()) this.finishRequested = true; });
    $('nextContract').addEventListener('click', () => this.brief(this.index+1));
    $('districtReplay').addEventListener('click', () => this.brief(0));
  },
  persist() {
    // Reward and unlocked contract share one write, avoiding duplicate payouts on reload.
    save('asterra-progress-v2', JSON.stringify({ coins: this.coins, nextIndex: this.nextIndex, completed: this.completed }));
  },
  brief(index = this.nextIndex) {
    this.api.reset();
    S.screen = 'contract'; $('controls').hidden = true;
    document.querySelector('.hud-top').inert = true;
    if (index >= CONTRACTS.length && this.nextIndex >= CONTRACTS.length) {
      $('districtDone').hidden = false;
      $('districtBuildings').innerHTML = CONTRACTS.map((p,i) => `<div>${voxelSVG(this.completed[i]?.cells || p.cells)}<strong>${p.short}</strong><span>${this.completed[i]?.grade || '—'} · DENSITY GRADE</span></div>`).join('');
      $('districtCoins').textContent = `${this.coins} coins · a new beginning for Asterra`;
      $('districtReplay').focus({ preventScroll: true }); return;
    }
    this.index = Math.max(0, Math.min(2, index, this.nextIndex));
    const p = this.plan;
    $('contractKicker').textContent = `ASTERRA REBUILDING OFFICE · ${this.index+1} OF 3`;
    $('contractTitle').textContent = p.name; $('contractDescription').textContent = p.description;
    $('contractBlueprint').innerHTML = voxelSVG(p.cells);
    $('contractBlueprint').setAttribute('aria-label', ['Rectangular blueprint', 'L-shaped blueprint with a taller wing', 'Indented courtyard blueprint with two wings'][this.index]);
    $('contractDimensions').textContent = `${p.w} × ${p.d} SITE · ${Math.max(...p.columns.map(c => c[2]))} LEVELS`;
    $('contractTarget').textContent = `${Math.round(p.goal*100)}% filled`; $('contractTiles').textContent = `${p.tiles} tiles`;
    $('contractLesson').textContent = p.lesson; $('contractBrief').hidden = false;
    $('contractAccept').focus({ preventScroll: true });
  },
  start() {
    const index = this.index;
    this.api.reset(); this.index = index;
    const p = this.plan, config = { baseplate: { ...CFG.baseplate }, pieces: CFG.run.pieces };
    CFG.baseplate.w = p.w; CFG.baseplate.d = p.d;
    CFG.baseplate.cells = p.columns.map(([x,z]) => [x,z]); CFG.run.pieces = p.tiles;
    this.api.reset(); this.savedCfg = config;
    this.active = true; this.paid = false; this.result = null; this.finishRequested = false;
    $('contractBrief').hidden = true; $('contractHUD').hidden = false;
    $('contractName').textContent = `${this.index+1} / 3 · ${p.short}`; $('hint').classList.add('gone');
    document.body.classList.add('contract-playing'); this.makeGuide(); this.update();
  },
  makeGuide() {
    const { geometry } = exterior(this.plan.cells);
    const edges = new THREE.EdgesGeometry(geometry); geometry.dispose();
    guide.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xa1e2ce, transparent: true, opacity: .65 })));
    const geo = new THREE.PlaneGeometry(.94,.94), material = new THREE.MeshBasicMaterial({ color: 0x9fd5bd, transparent: true, opacity: .18, depthWrite: false });
    for (const [x,z] of this.plan.columns) {
      const tile = new THREE.Mesh(geo, material); tile.rotation.x = -Math.PI/2; tile.position.set(x,.015,z); guide.add(tile);
    }
    guide.visible = true;
  },
  clear() {
    if (this.savedCfg) { Object.assign(CFG.baseplate, this.savedCfg.baseplate); CFG.baseplate.cells = this.savedCfg.baseplate.cells; CFG.run.pieces = this.savedCfg.pieces; this.savedCfg = null; }
    this.active = false; this.finishRequested = false;
    const geometries = new Set(), materials = new Set();
    guide.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); guide.clear(); guide.visible = false;
    if (this.building) { scene.remove(this.building.group); this.building.dispose(); this.building = null; }
    for (const id of ['contractBrief','contractHUD','finishBuild','nextContract','districtDone','buildReveal']) $(id).hidden = true;
    document.body.classList.remove('contract-playing','building-reveal','contract-results');
  },
  cells() { return [...World.occ.keys()].map(k => k.split(',').map(Number)).filter(c => c[1]>=0); },
  filled() { return this.plan.cells.reduce((n,c) => n + Number(World.has(...c)), 0); },
  ready() { return this.active && this.filled() >= Math.ceil(this.plan.cells.length*this.plan.goal); },
  update() {
    if (!this.active) return;
    const pct = Math.round(this.filled()/this.plan.cells.length*100), ready = this.ready();
    $('contractDensity').textContent = `${pct}% FILLED`; $('contractProgress').style.width = `${pct}%`;
    $('contractWallet').textContent = `${this.coins} ◈`;
    $('finishBuild').hidden = !ready || S.phase === 'finishing' || S.phase === 'over'; $('finishBuild').disabled = S.pending > 0;
    $('contractObjective').textContent = ready ? 'Ready to finish · or stack for a higher grade' : `Fill ${Math.round(this.plan.goal*100)}% of the blueprint`;
  },
  checkCompletion() {
    return this.active && S.pending === 0 && S.falling.length === 0 && (this.finishRequested || this.filled() === this.plan.cells.length);
  },
  end(why) {
    if (!this.active || S.phase === 'finishing' || this.result) return;
    if (S.piece) { scene.remove(S.piece.root); S.piece.mat.dispose(); S.piece = null; }
    S.queuedDrop = false;
    const cells = this.cells(), filled = this.filled();
    // Extra volume never inflates density. Perfect points never enter this score.
    const density = filled / (this.plan.cells.length + cells.length - filled), complete = this.ready();
    const grade = density >= .95 ? 'A+' : density >= .85 ? 'A' : density >= .75 ? 'B' : density >= .65 ? 'C' : 'D';
    const reward = complete ? Math.round((40 + 160*density*density)*(1+this.index*.35)) : 0;
    this.result = { complete, density, grade, reward, cells, why };
    $('controls').hidden = true; $('finishBuild').hidden = true; guide.visible = false;
    if (!complete) { this.showResults(); return; }
    this.building = makeBuilding(cells, this.plan); scene.add(this.building.group);
    this.revealTime = 0; S.phase = 'finishing'; document.body.classList.add('building-reveal');
    $('buildReveal').hidden = false; $('buildReveal').textContent = 'A NEW LIGHT IN ASTERRA';
    AudioFX.power(); this.building.reveal(0);
  },
  tick(dt) {
    if (S.phase !== 'finishing' || !this.building) return;
    this.revealTime += dt;
    const duration = reducedMotion() ? .25 : 2.8, t = Math.min(1, this.revealTime/duration);
    this.building.reveal(t);
    const height = -.2+t*(this.building.maxY+.8), position = new THREE.Vector3();
    for (const p of S.pieces) for (const m of p.meshes) { m.getWorldPosition(position); m.visible = position.y+.5 > height; }
    if (t >= 1) {
      S.pieces.forEach(p => { p.root.visible = false; });
      if (this.revealTime >= duration+.65) this.showResults();
    }
  },
  showResults() {
    const r = this.result; if (!r) return;
    S.phase = 'over';
    if (r.complete && !this.paid) {
      this.coins += r.reward; this.paid = true; this.nextIndex = Math.max(this.nextIndex, this.index+1);
      this.completed[this.index] = { cells: r.cells, grade: r.grade }; this.persist();
    }
    $('buildReveal').hidden = true; $('end').hidden = false;
    document.body.classList.remove('building-reveal'); document.body.classList.add('contract-results');
    $('endTitle').textContent = r.complete ? this.plan.name : 'LET’S TRY THAT AGAIN';
    $('endSub').textContent = r.complete ? 'A place for Asterra to call home. Drag to admire your building.' : `${r.why === 'strikes' ? 'Three missed placements.' : 'All tiles used.'} Fill the blueprint to finish this contract.`;
    $('endGrid').innerHTML = r.complete ? `<div class="density-grade"><span>DENSITY GRADE</span><b>${r.grade}</b></div><div class="coin-reward"><span>COINS EARNED</span><b>+ ${r.reward} <small>◈</small></b></div>` : `<div><span>BLUEPRINT FILLED</span><b>${Math.round(this.filled()/this.plan.cells.length*100)}%</b></div><div><span>YOUR TARGET</span><b>${Math.round(this.plan.goal*100)}%</b></div>`;
    $('nextContract').hidden = !r.complete; $('nextContract').textContent = this.index === 2 ? 'SEE YOUR NEIGHBORHOOD →' : 'NEXT CONTRACT →';
    $('againBtn').textContent = r.complete ? 'REBUILD THIS CONTRACT' : 'TRY AGAIN'; this.update();
  },
};
