import { CFG } from './config.js';
import { S } from './state.js';
import { Poly } from './poly.js';
import { Cam } from './camera.js';
import { voxelSVG } from './blueprints.js';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/* =====================================================================
   POWERUPS — registry so more can be added later
   ===================================================================== */
export const POWERUPS = {
  shadow: { name: 'Placement Shadow', icon: '◇', description: 'See where the current tile will land. Lasts until you drop it.' },
  slow: { name: 'Slow Speed', icon: '◷', description: 'Half-speed movement for 12 seconds of aiming time.' },
  view: { name: 'View / Zoom', icon: '⌕', description: 'A closer, higher view for 12 seconds of aiming time.' },
  choice: { name: 'Tile Choice', icon: '▦', description: 'Pick your next 3 tiles from 5 options, in the order you want.' },
};

const $ = id => document.getElementById(id);
const shapes = [
  { name: 'Domino', cells: [[0,0,0],[1,0,0]] },
  { name: 'Line', cells: [[0,0,0],[1,0,0],[2,0,0]] },
  { name: 'Corner', cells: [[0,0,0],[1,0,0],[0,0,1]] },
  { name: 'Square', cells: [[0,0,0],[1,0,0],[0,0,1],[1,0,1]] },
  { name: 'Step', cells: [[0,0,0],[1,0,0],[1,1,0],[1,1,1]] },
].map(p => ({ ...p, cells: Poly.normalize(p.cells).cells }));

export const Powers = {
  selected: [], savedView: null, api: null,
  get ready() { return S.meter >= Math.max(1, CFG.meter.max|0); },
  init(api) {
    this.api = api;
    $('powerOptions').innerHTML = Object.entries(POWERUPS).map(([key,p]) => `<button class="power-option" data-power="${key}"><span class="power-glyph" aria-hidden="true">${p.icon}</span><span><strong>${p.name}</strong><small>${p.description}</small></span><span aria-hidden="true">→</span></button>`).join('');
    $('powerOptions').addEventListener('click', e => { const button = e.target.closest('[data-power]'); if (button) this.api.use(button.dataset.power); });
    $('closePowers').addEventListener('click', () => this.close());
    $('cancelTiles').addEventListener('click', () => this.open());
    $('confirmTiles').addEventListener('click', () => {
      if (!this.ready || this.selected.length !== 3) return;
      S.tileQueue = this.selected.map(i => shapes[i].cells.map(c => [...c]));
      this.spend(); this.close(); this.api.update();
    });
    $('tileOptions').addEventListener('click', e => {
      const button = e.target.closest('[data-tile]'); if (!button) return;
      const i = Number(button.dataset.tile), at = this.selected.indexOf(i);
      if (at >= 0) this.selected.splice(at,1); else if (this.selected.length < 3) this.selected.push(i);
      this.renderTiles();
    });
  },
  notifyReady() {
    // Native iPhone haptics; Android browsers can use Vibration API. Unsupported devices stay silent.
    if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    else if (navigator.vibrate) navigator.vibrate(35);
  },
  open() {
    if (!this.ready || S.paused || !['aim','wait','drop'].includes(S.phase)) return;
    S.screen = 'powers'; $('powerPicker').hidden = false; $('tilePicker').hidden = true;
    $('controls').hidden = true; document.querySelector('.hud-top').inert = true;
    $('closePowers').focus({ preventScroll: true });
  },
  close() {
    $('powerPicker').hidden = true; $('tilePicker').hidden = true;
    if (S.screen === 'powers' || S.screen === 'tiles') S.screen = '';
    document.querySelector('.hud-top').inert = false;
    $('controls').hidden = S.paused || S.phase === 'over' || S.phase === 'finishing';
  },
  spend() { S.meter = 0; $('meter').classList.remove('full'); $('powerBtn').classList.remove('ready','arriving'); },
  activate(kind) {
    if (!POWERUPS[kind] || !this.ready || S.paused || !['aim','wait','drop'].includes(S.phase)) return false;
    if (S.screen && S.screen !== 'powers') return false;
    if (kind === 'choice') {
      if (S.tileQueue.length) return false;
      this.selected = []; S.screen = 'tiles'; $('powerPicker').hidden = true; $('tilePicker').hidden = false;
      $('controls').hidden = true; document.querySelector('.hud-top').inert = true;
      this.renderTiles(); $('cancelTiles').focus({ preventScroll: true }); return true;
    }
    if (S.active[kind] > 0 || (kind === 'shadow' && !S.piece)) return false;
    this.spend();
    if (kind === 'shadow') S.active.shadow = 1;
    if (kind === 'slow') S.active.slow = 12;
    if (kind === 'view') {
      this.savedView = { pitch: Cam.goalPitch, zoom: Cam.zoom };
      Cam.goalPitch = Math.min(CFG.camera.pitchMax, .94); Cam.zoom = .82; S.active.view = 12;
    }
    this.close(); return true;
  },
  renderTiles() {
    $('tileOptions').innerHTML = shapes.map((p,i) => {
      const at = this.selected.indexOf(i);
      return `<button class="tile-option ${at >= 0 ? 'selected' : ''}" data-tile="${i}" aria-label="${p.name}${at>=0 ? ', choice '+(at+1) : ''}" aria-pressed="${at>=0}">${voxelSVG(p.cells)}<strong>${p.name}</strong><span>${at>=0 ? at+1 : '+'}</span></button>`;
    }).join('');
    $('tileSelection').textContent = this.selected.length ? this.selected.map((i,n) => `${n+1}. ${shapes[i].name}`).join(' → ') : 'Tap three tiles in the order you want them.';
    $('confirmTiles').disabled = this.selected.length !== 3;
    $('confirmTiles').textContent = `QUEUE ${this.selected.length} / 3 TILES`;
  },
  tick(dt) {
    if (S.phase !== 'aim') return;
    for (const kind of ['slow','view']) if (S.active[kind] > 0) {
      S.active[kind] = Math.max(0, S.active[kind]-dt);
      if (kind === 'view' && !S.active.view) this.restoreView();
    }
  },
  restoreView() {
    if (this.savedView) { Cam.goalPitch = this.savedView.pitch; Cam.zoom = this.savedView.zoom; this.savedView = null; }
  },
  reset() {
    this.restoreView(); this.close(); this.selected = [];
    this.signature = '';
    S.active = { shadow: 0, slow: 0, view: 0 }; S.tileQueue = [];
  },
  update() {
    const ready = this.ready, active = [];
    if (S.active.shadow > 0) active.push('Shadow on');
    if (S.active.slow > 0) active.push(`Slow ${Math.ceil(S.active.slow)}s`);
    if (S.active.view > 0) active.push(`View ${Math.ceil(S.active.view)}s`);
    if (S.tileQueue.length) active.push(`${S.tileQueue.length} tiles queued`);
    const signature = [ready,active.join('|'),!!S.piece].join();
    if (signature === this.signature) return;
    this.signature = signature;
    const button = $('powerBtn');
    button.classList.toggle('ready', ready); button.classList.toggle('empty', !ready && !active.length);
    button.classList.toggle('active', !!active.length && !ready);
    button.disabled = !ready;
    button.innerHTML = `<span class="power-star" aria-hidden="true">✧</span>${ready ? 'POWER READY' : 'POWERUPS'}<small>${ready ? 'choose one' : active.length ? 'active' : 'perfects charge it'}</small>`;
    $('activePowers').textContent = active.join(' · '); $('activePowers').hidden = !active.length;
    for (const [kind] of Object.entries(POWERUPS)) {
      const option = document.querySelector(`[data-power="${kind}"]`);
      if (option) option.disabled = kind === 'choice' ? S.tileQueue.length > 0 : S.active[kind] > 0 || (kind === 'shadow' && !S.piece);
    }
  },
};
