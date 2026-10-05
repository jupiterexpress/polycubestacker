import * as THREE from 'three';
import { CFG } from './config.js';
import { S } from './state.js';
import { World } from './world.js';
import { scene } from './scene.js';

const $ = id => document.getElementById(id);
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Keep session values. */ } };
const guide = new THREE.Group(); guide.visible = false; scene.add(guide);
const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5, 3, 5)),
  new THREE.LineBasicMaterial({ color: 0x9ce1d3, transparent: true, opacity: 0.7 }));
outline.position.y = 1.5; guide.add(outline);
const accents = new THREE.Group(); scene.add(accents);
const lightGeo = new THREE.BoxGeometry(0.14, 0.2, 0.02);
const lightMat = new THREE.MeshBasicMaterial({ color: 0xffc77a });

export const Contract = {
  active: false, paid: false, upgraded: false, savedCfg: null, coins: 0,
  init(api) {
    this.api = api;
    this.coins = Math.max(0, Number(read('asterra-coins')) || 0);
    $('contractAccept').addEventListener('click', () => this.start());
    $('finishUpgrade').addEventListener('click', () => this.upgrade());
  },
  brief() {
    this.api.reset();
    S.screen = 'contract'; $('contractBrief').hidden = false; $('controls').hidden = true;
    document.querySelector('.hud-top').inert = true;
    $('contractAccept').focus({ preventScroll: true });
  },
  start() {
    this.api.reset();
    const config = { w: CFG.baseplate.w, d: CFG.baseplate.d, pieces: CFG.run.pieces };
    CFG.baseplate.w = 5; CFG.baseplate.d = 5; CFG.run.pieces = 30;
    this.api.reset(); this.savedCfg = config;
    this.active = true; this.paid = false; this.upgraded = false;
    $('contractBrief').hidden = true; $('contractHUD').hidden = false;
    $('hint').classList.add('gone');
    guide.visible = true; this.update();
  },
  clear() {
    if (this.savedCfg) {
      CFG.baseplate.w = this.savedCfg.w; CFG.baseplate.d = this.savedCfg.d; CFG.run.pieces = this.savedCfg.pieces;
      this.savedCfg = null;
    }
    this.active = false; guide.visible = false;
    accents.clear();
    $('contractBrief').hidden = true; $('contractHUD').hidden = true;
    $('finishUpgrade').hidden = true; $('upgradeStatus').hidden = true;
  },
  filled() {
    let count = 0;
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) for (let y = 0; y < 3; y++) if (World.has(x, y, z)) count++;
    return count;
  },
  update() {
    if (!this.active) return;
    $('contractDensity').textContent = `${Math.round(this.filled() / 75 * 100)}% / 60% DENSITY`;
    $('contractWallet').textContent = `${this.coins} COINS`;
  },
  finish() {
    if (!this.active) return null;
    const filled = this.filled(), density = filled / 75;
    const reward = filled + Math.floor(50 * density * density);
    if (!this.paid) { this.coins += reward; save('asterra-coins', this.coins); this.paid = true; }
    this.update();
    $('finishUpgrade').hidden = false;
    $('finishUpgrade').disabled = this.coins < 20 || !filled;
    $('upgradeStatus').hidden = false;
    $('upgradeStatus').textContent = !filled ? 'Place tiles inside the blueprint to create a building to customize.' : this.coins < 20 ? `${20 - this.coins} more coins to add warm amber lights.` : 'Give your building a warm welcome.';
    return { density: Math.round(density * 100), reward, complete: filled >= 45 };
  },
  upgrade() {
    if (!this.active || !this.paid || this.upgraded || this.coins < 20 || !this.filled()) return;
    this.coins -= 20; save('asterra-coins', this.coins); this.upgraded = true;
    for (const key of World.occ.keys()) {
      const [x, y, z] = key.split(',').map(Number); if (y < 0) continue;
      if (!World.has(x, y, z + 1)) for (const dx of [-0.23, 0.23]) {
        const light = new THREE.Mesh(lightGeo, lightMat); light.position.set(x + dx, y + 0.5, z + 0.49); accents.add(light);
      }
      if (!World.has(x + 1, y, z)) for (const dz of [-0.23, 0.23]) {
        const light = new THREE.Mesh(lightGeo, lightMat); light.rotation.y = Math.PI / 2;
        light.position.set(x + 0.49, y + 0.5, z + dz); accents.add(light);
      }
    }
    $('finishUpgrade').hidden = true;
    $('upgradeStatus').textContent = 'Amber lights installed. A little more life in Asterra.';
    this.update();
  },
};
