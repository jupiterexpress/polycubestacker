import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './styles.css';
import { CFG } from './config.js';
import { World } from './world.js';
import { Physics } from './physics.js';
import { Movement } from './movement.js';
import { renderer, scene, camera } from './scene.js';
import { Cam, initCameraInput } from './camera.js';
import { S } from './state.js';
import { step, advanceClock, reset, place, rotateY, tip, turn, usePower } from './game.js';
import { initUI, setPaused, celebrate } from './ui.js';

/* =====================================================================
   LOOP
   ===================================================================== */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w < h ? 50 : 40; camera.updateProjectionMatrix();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (S.paused) Cam.update(dt); else { advanceClock(dt); step(dt); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
initUI();
initCameraInput();

reset();
resize();
Cam.update(1);
requestAnimationFrame(frame);

/* debug handle for tuning and automated checks */
window.STACKER = { CFG, S, World, Physics, Movement, Cam, camera: () => camera, place, rotate: rotateY, tip, turn, setPaused, celebrate: () => { S.inv.shadow = (S.inv.shadow || 0) + 1; celebrate(); }, usePower, reset,
  step(n, dt, noRender) { for (let i = 0; i < n; i++) step(dt || 1 / 60); if (!noRender) renderer.render(scene, camera); } };
