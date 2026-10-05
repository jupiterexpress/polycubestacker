import * as THREE from 'three';
import { baseRect } from './world.js';

/* =====================================================================
   RENDERING
   ===================================================================== */
export const canvas = document.getElementById('scene');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x294b49, 34, 80);
export const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220);

// Two lights: an angled key light shades the blocks (lit tops, darker sides) but casts no shadow;
// a straight-down light casts every shadow, so a hovering piece's shadow sits exactly on the squares below it.
scene.add(new THREE.HemisphereLight(0xc3e0eb, 0x37534b, 0.7));
export const sun = new THREE.DirectionalLight(0xfff2de, 0.5);
sun.castShadow = false;
scene.add(sun, sun.target);
export const SUN_OFFSET = new THREE.Vector3(-7, 14, 5);
export const topLight = new THREE.DirectionalLight(0xffffff, 0.85);
topLight.castShadow = true;
topLight.shadow.mapSize.set(2048, 2048);
topLight.shadow.bias = -0.0004; topLight.shadow.normalBias = 0.02;
topLight.shadow.camera.up.set(0, 0, -1);      // straight-down light: keep the shadow camera's up off the view axis
scene.add(topLight, topLight.target);

export const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
export const CUBE = 0.965;
export const cubeGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
export const edgeGeo = new THREE.EdgesGeometry(cubeGeo);
const edgeMat = new THREE.LineBasicMaterial({ color: 0x10161d, transparent: true, opacity: 0.28 });

// The visible cube is slightly undersized so its edges read, which let light leak through the seams
// and drew grid lines inside shadows. Shadows now come from an invisible caster that is full width
// (no seams between neighbours) and a little shorter (its top sits below the cube's own top face,
// so a cube never shades itself).
const shadowGeo = new THREE.BoxGeometry(1, 0.9, 1);
const shadowMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
export function makeCube(mat) {
  const m = new THREE.Mesh(cubeGeo, mat); m.castShadow = false; m.receiveShadow = true;
  m.add(new THREE.LineSegments(edgeGeo, edgeMat));
  const caster = new THREE.Mesh(shadowGeo, shadowMat); caster.castShadow = true; caster.receiveShadow = false;
  m.add(caster);
  return m;
}

/* baseplate: gridded slab with a hazard-striped rim on a concrete plinth */
const baseGroup = new THREE.Group(); scene.add(baseGroup);
function cellTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#5b6771'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#7a8791'; g.lineWidth = 2; g.strokeRect(1, 1, 62, 62);
  g.fillStyle = '#6b7882'; g.fillRect(30, 30, 4, 4);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return t;
}
function stripeTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#3d4750'; g.fillRect(0, 0, 64, 64);
  g.save(); g.beginPath(); g.rect(0, 0, 64, 20); g.clip();
  g.fillStyle = '#e2a531'; g.fillRect(0, 0, 64, 20);
  g.fillStyle = '#1c232b';
  for (let i = -64; i < 128; i += 22) { g.beginPath(); g.moveTo(i, 20); g.lineTo(i + 11, 20); g.lineTo(i + 31, 0); g.lineTo(i + 20, 0); g.fill(); }
  g.restore();
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding;
  return t;
}
export function buildBaseplate() {
  while (baseGroup.children.length) { const o = baseGroup.children.pop(); o.geometry && o.geometry.dispose(); }
  const { w, d, x0, z0 } = baseRect();
  const cx = x0 + (w - 1) / 2, cz = z0 + (d - 1) / 2;
  const top = cellTexture(); top.repeat.set(w, d);
  const sx = stripeTexture(); sx.repeat.set(d, 1);
  const sz = stripeTexture(); sz.repeat.set(w, 1);
  const mTop = new THREE.MeshStandardMaterial({ map: top, roughness: 0.85 });
  const mSx = new THREE.MeshStandardMaterial({ map: sx, roughness: 0.8 });
  const mSz = new THREE.MeshStandardMaterial({ map: sz, roughness: 0.8 });
  const mBot = new THREE.MeshStandardMaterial({ color: lin(0x323a42) });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), [mSx, mSx, mTop, mBot, mSz, mSz]);
  slab.position.set(cx, -0.5, cz); slab.receiveShadow = true; slab.castShadow = true;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.6, w - 0.8), 18, Math.max(0.6, d - 0.8)),
    new THREE.MeshStandardMaterial({ color: lin(0x8a8f8c), roughness: 0.95 }));
  plinth.position.set(cx, -10, cz); plinth.receiveShadow = false;   // shadows only on the plate and blocks
  baseGroup.add(slab, plinth);
}
const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 48), new THREE.MeshStandardMaterial({ color: lin(0x385850), roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -19; ground.receiveShadow = false; scene.add(ground);
