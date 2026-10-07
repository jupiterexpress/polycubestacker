import { CFG } from './config.js';
import { World } from './world.js';
import { AudioFX } from './audio.js';
import { Cam } from './camera.js';
import { ghost } from './guides.js';
import { S, used, runTotal, speedMul } from './state.js';
import { place, rotateY, tip, turn, canTurn, usePower, reset, compactness } from './game.js';
import { Tutorial } from './tutorial.js';
import { Contract } from './contract.js';
import { Powers } from './powerups.js';

/* =====================================================================
   UI
   ===================================================================== */
export const $ = id => document.getElementById(id);
export const statsEl = $('stats'), meterEl = $('meter'), segsEl = $('segs'), meterNum = $('meterNum');
export const pauseEl = $('pause'), appEl = $('app');
export const endEl = $('end'), controlsEl = $('controls'), turnBtn = $('turnBtn'), turnLabel = $('turnLabel');
export const powerBtn = $('powerBtn'), placeBtn = $('placeBtn'), tipBtn = $('tipBtn'), toastEl = $('toast'), hintEl = $('hint');
const shadowSvg = '<svg class="shadow-icon" viewBox="0 0 30 18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="10" y="1" width="10" height="7" rx="1"/><path d="M15 9v3" stroke-dasharray="1.5 1.5"/><rect x="10" y="12" width="10" height="5" rx="1" stroke-dasharray="2 1.6"/></svg>';

export function buildSegs() {
  const n = Math.max(1, CFG.meter.max | 0);
  segsEl.innerHTML = '';
  for (let i = 0; i < n; i++) { const s = document.createElement('div'); s.className = 'seg'; segsEl.appendChild(s); }
}
export function updateHUD() {
  Contract.update();
  const b = World.bounds, max = Math.max(1, CFG.meter.max | 0);
  if (segsEl.children.length !== max) buildSegs();
  const celebrating = Powers.ready;
  [...segsEl.children].forEach((s, i) => s.classList.toggle('on', celebrating || i < S.meter));
  meterNum.textContent = (celebrating ? max : Math.min(S.meter, max)) + '/' + max;
  statsEl.innerHTML =
    '<span>PIECE</span> <b>' + Math.min(runTotal(), used() + (S.piece ? 1 : 0)) + '/' + runTotal() + '</b> <span>·</span> ' +
    '<span>PLACED</span> <b>' + S.placed + '</b> <span>· FELL</span> <b>' + S.fell + '</b>' +
    ' <span>· HEIGHT</span> <b>' + (b.topY + 1) + '</b>' + strikeMarks() + speedTag();
  Powers.update();
  if (Contract.active) statsEl.innerHTML = `<span>TILES</span> <b>${Math.min(runTotal(), used()+(S.piece ? 1 : 0))}/${runTotal()}</b> <span>·</span> <span>PLACED</span> <b>${S.placed}</b>${strikeMarks()}`;
  tipBtn.hidden = !CFG.rotate.allowTip;
  const p = S.piece, lim = CFG.turn.maxPerPiece | 0, cost = CFG.turn.meterCost | 0;
  let sub = '';
  if (lim > 0) sub = Math.max(0, lim - (p ? p.turns : 0)) + ' left';
  if (cost > 0) sub = (sub ? sub + ' · ' : '') + cost + ' pwr';
  turnLabel.innerHTML = 'AXIS' + (sub ? '<small> ' + sub + '</small>' : '');
  turnBtn.classList.toggle('spent', !!p && !canTurn(p));
}
function speedTag() {
  const m = S.piece ? S.piece.speedMul : speedMul(used());
  return m > 1.001 ? ' <span>· SPEED</span> <b>' + m.toFixed(2) + '×</b>' : '';
}
function strikeMarks() {
  const lim = CFG.strikes.limit | 0; if (lim <= 0) return '';
  let m = '';
  for (let i = 0; i < lim; i++) m += i < S.strikes ? '<i class="hit">✕</i>' : '<i>○</i>';
  return ' <span>·</span> <span class="strk" aria-label="' + S.strikes + ' of ' + lim + ' strikes">' + m + '</span>';
}
export function toast(text, kind) {
  toastEl.textContent = text; toastEl.className = 'toast ' + (kind || '');
  void toastEl.offsetWidth; toastEl.classList.add('show');
}
export function hideHint() { hintEl.classList.add('gone'); }

// buttons: fire on pointerdown for responsiveness; keyboard activation arrives as click with detail 0
function bindBtn(el, fn) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); AudioFX.unlock(); if (S.paused) return; el.classList.add('pressed'); fn(); });
  const up = () => el.classList.remove('pressed');
  el.addEventListener('pointerup', up); el.addEventListener('pointerleave', up); el.addEventListener('pointercancel', up);
  el.addEventListener('click', e => { if (e.detail === 0 && !S.paused) fn(); });
}

export function setPaused(on) {
  if (S.screen) return;
  if (Tutorial.mode === 'overview' || Tutorial.mode === 'complete') return;
  if (S.phase === 'finishing') { S.paused = on; return; }
  if (on && S.phase === 'over') return;
  S.paused = on;
  pauseEl.hidden = !on || !sheet.hidden;
  controlsEl.hidden = on || S.phase === 'over';
  if (on) toastEl.className = 'toast';
}


/* tuning sheet */
const TUNE = [
  ['move.speed', 'Piece speed', 'cells/s', 0.5, 8, 0.1],
  ['move.margin', 'Travel past edge', 'cells', 0, 6, 1],
  ['move.hoverGap', 'Hover gap', 'cells', 1, 6, 0.5],
  ['move.rampTo', 'Speed on last piece', '×', 1, 2.5, 0.05],
  ['guides.pathLine', 'Show path line', '', 'bool'],
  ['move.pattern', 'Starting travel axis', '', ['alternate', 'x', 'z']],
  ['turn.maxPerPiece', 'Axis changes per piece (0 = unlimited)', '', 0, 6, 1],
  ['turn.meterCost', 'Axis change cost', 'pwr', 0, 6, 1],
  ['strikes.limit', 'Strike limit (0 = off)', 'strikes', 0, 10, 1],
  ['strikes.topple', 'Topples count as strikes', '', 'bool'],
  ['run.pieces', 'Pieces per build', 'pieces', 5, 120, 1],
  ['buildArea.trim', 'Trim cubes outside baseplate', '', 'bool'],
  ['buildArea.pause', 'Hold before trim', 's', 0, 1, 0.05],
  ['buildArea.slice', 'Trim sweep time', 's', 0.05, 0.8, 0.05],
  ['buildArea.tip', 'Trim tip-over time', 's', 0.05, 0.8, 0.05],
  ['buildArea.fall', 'Trim fall time', 's', 0.05, 1, 0.05],
  ['piece.minCells', 'Min cubes per piece', '', 1, 8, 1],
  ['piece.maxCells', 'Max cubes per piece', '', 1, 8, 1],
  ['rotate.allowTip', 'Allow flipping', '', 'bool'],
  ['piece.spawnFlat', 'Tiles arrive lying flat', '', 'bool'],
  ['physics.tolerance', 'Stability slack', 'cells', -0.4, 0.6, 0.05],
  ['physics.gravity', 'Drop gravity', 'cells/s²', 5, 90, 1],
  ['meter.max', 'Meter size', 'pts', 1, 20, 1],
  ['meter.success', 'Points: placed (not perfect)', 'pts', 0, 6, 1],
  ['meter.perfect', 'Points: perfect', 'pts', 0, 10, 1],
  ['perfect.minSupport', 'Perfect needs underside supported', '', 0.5, 1, 0.05],
  ['powerups.shadow.placements', 'Landing Shadow lasts', 'placements', 1, 20, 1],
  ['celebrate.flash', 'Meter-full flash', 's', 0, 0.4, 0.05],
  ['celebrate.spark', 'Meter-full spark', 's', 0, 0.5, 0.05],
  ['celebrate.pop', 'Meter-full pop', 's', 0, 0.5, 0.05],
  ['powerups.shadow.showStability', 'Shadow shows stable/unstable', '', 'bool'],
  ['camera.ring', 'Camera fit (keep tile paths in view)', '', 0, 1, 0.05],
  ['camera.sens', 'Camera drag sensitivity', '', 0.002, 0.02, 0.0005],
  ['camera.settle', 'Camera settle after drag', 's', 0, 0.2, 0.01],
  ['baseplate.w', 'Baseplate width', 'cells', 1, 12, 1, 'restart'],
  ['baseplate.d', 'Baseplate depth', 'cells', 1, 12, 1, 'restart'],
];
const getP = path => path.split('.').reduce((o, k) => o[k], CFG);
const setP = (path, v) => { const ks = path.split('.'), last = ks.pop(); ks.reduce((o, k) => o[k], CFG)[last] = v; };
function fmt(v, step) { return step < 1 ? (+v).toFixed(String(step).split('.')[1].length) : String(v); }
function buildTune() {
  const grid = $('tuneGrid');
  TUNE.forEach(([path, label, unit, a, b, step, note], i) => {
    const row = document.createElement('div'); row.className = 'row'; const id = 'tune-' + path.replace(/\./g, '-');
    const val = getP(path);
    if (b === undefined && a === 'bool') {
      row.innerHTML = '<label for="' + id + '">' + label + '</label><input type="checkbox" id="' + id + '"' + (val ? ' checked' : '') + '>';
      row.querySelector('input').addEventListener('change', e => { setP(path, e.target.checked); updateHUD(); ghost.sig = ''; });
    } else if (Array.isArray(a)) {
      row.innerHTML = '<label for="' + id + '">' + label + '</label><select id="' + id + '">' + a.map(o => '<option' + (o === val ? ' selected' : '') + '>' + o + '</option>').join('') + '</select>';
      row.querySelector('select').addEventListener('change', e => setP(path, e.target.value));
    } else {
      row.innerHTML = '<label for="' + id + '">' + label + '</label><output>' + fmt(val, step) + (unit ? ' ' + unit : '') + '</output>' +
        '<input type="range" id="' + id + '" min="' + a + '" max="' + b + '" step="' + step + '" value="' + val + '">' +
        (note === 'restart' ? '<span class="note">applies on restart</span>' : '');
      const out = row.querySelector('output');
      row.querySelector('input').addEventListener('input', e => {
        const v = parseFloat(e.target.value); setP(path, v); out.textContent = fmt(v, step) + (unit ? ' ' + unit : '');
        if (path.startsWith('meter.')) S.meter = Math.min(S.meter, Math.max(1, CFG.meter.max | 0) - 1);
        updateHUD();
      });
    }
    grid.appendChild(row);
  });
}
export const sheet = $('sheet');


/* Full charge stays available until a powerup is actually used. */
export function celebrate() {
  S.celebrateUntil = performance.now() + 450;
  meterEl.classList.add('full');
  Powers.notifyReady(); AudioFX.power();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) powerBtn.animate([
    { transform: 'translateX(0)' }, { transform: 'translateX(-3px)' },
    { transform: 'translateX(3px)' }, { transform: 'translateX(0)' },
  ], { duration: 250, iterations: 2 });
  updateHUD();
}


export function endRun(why) {
  if (Contract.active) { Contract.end(why); hideHint(); return; }
  S.phase = 'over';
  $('endTitle').textContent = why === 'strikes' ? 'OUT OF STRIKES' : 'BUILD COMPLETE';
  const b = World.bounds;
  const stats = [
    ['PLACED', S.placed + '/' + runTotal()], ['FELL', S.fell], (CFG.strikes.limit | 0) > 0 ? ['STRIKES', S.strikes + '/' + (CFG.strikes.limit | 0)] : ['PERFECT', S.perfects],
    ['HEIGHT', b.topY + 1], ['FOOTPRINT', (b.maxX - b.minX + 1) + '×' + (b.maxZ - b.minZ + 1)],
    ['COMPACT', Math.round(compactness() * 100) + '%', 'hi'],
  ];
  $('endGrid').innerHTML = stats.map(([k, v, c]) => '<div class="' + (c || '') + '"><span>' + k + '</span><b>' + v + '</b></div>').join('');
  $('endSub').textContent = S.cubes + ' cubes · ' + S.perfects + ' perfect · drag to change camera angle';
  $('againBtn').textContent = 'BUILD AGAIN';
  controlsEl.hidden = true; endEl.hidden = false; hideHint();
  AudioFX.power();
}


/* wire every control once at startup */
export function initUI() {
  bindBtn($('rotBtn'), rotateY);
  bindBtn(tipBtn, tip);
  bindBtn(placeBtn, place);
  bindBtn(turnBtn, turn);
  $('againBtn').addEventListener('click', () => Contract.active ? Contract.start() : reset());
  $('pauseBtn').addEventListener('click', () => setPaused(!S.paused));
  $('resumeBtn').addEventListener('click', () => setPaused(false));
  $('pRestartBtn').addEventListener('click', () => { if (Tutorial.mode === 'challenge') Tutorial.challenge(); else if (Contract.active) Contract.start(); else reset(); setPaused(false); });
  $('tutorialReplay').addEventListener('click', () => Tutorial.start());
  $('pTuneBtn').addEventListener('click', () => { sheet.hidden = false; pauseEl.hidden = true; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); else if (S.phase === 'finishing') S.paused = false; });
  window.addEventListener('blur', () => setPaused(true));
  window.addEventListener('focus', () => { if (S.phase === 'finishing') S.paused = false; });
  bindBtn(powerBtn, () => Powers.open());
  window.addEventListener('keydown', e => {
    if (S.screen === 'powers' || S.screen === 'tiles') { if (e.key === 'Escape') Powers.close(); return; }
    if (S.screen || S.phase === 'finishing' || (e.target.closest && e.target.closest('.sheet, input, textarea'))) return;
    const k = e.key.toLowerCase();
    if ((k === ' ' || k === 'enter') && e.target.closest?.('button')) return;
    if (Tutorial.mode === 'overview' || Tutorial.mode === 'complete') return;
    if (k === 'p' || k === 'escape') { setPaused(!S.paused); return; }
    if (S.paused) return;
    if (k === ' ' || k === 'enter') { e.preventDefault(); place(); }
    else if (k === 'r') rotateY();
    else if (k === 'e') turn();
    else if (k === 't') tip();
    else if (k === 's') Powers.open();
    else if (k === 'arrowleft') Cam.goalYaw -= 0.15;
    else if (k === 'arrowright') Cam.goalYaw += 0.15;
    else if (k === 'arrowup') Cam.goalPitch += 0.1;
    else if (k === 'arrowdown') Cam.goalPitch -= 0.1;
  });
  buildTune();
  $('gearBtn').addEventListener('click', () => {
    if (S.phase === 'finishing') return;
    if (sheet.hidden) { sheet.hidden = false; if (S.phase !== 'over') { S.paused = true; controlsEl.hidden = true; } pauseEl.hidden = true; }
    else { sheet.hidden = true; if (S.paused) setPaused(true); }
  });
  $('closeSheet').addEventListener('click', () => { sheet.hidden = true; if (S.paused) setPaused(true); });
  $('grantBtn').addEventListener('click', () => { S.meter = CFG.meter.max; celebrate(); });
  $('fillBtn').addEventListener('click', () => { S.meter = Math.max(0, Math.max(1, CFG.meter.max | 0) - 1); updateHUD(); });
  $('restartBtn').addEventListener('click', () => { if (Tutorial.mode === 'challenge') Tutorial.challenge(); else if (Contract.active) Contract.start(); else reset(); sheet.hidden = true; setPaused(false); });
}
