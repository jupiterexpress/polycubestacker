import * as THREE from 'three';

// An authored miniature, built from the same simple solids as the stacking game.
// No images or remote assets are needed, including in the packaged mobile app.
export function createOpeningScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  camera.position.set(13, 12, 16); camera.lookAt(0, 1, 0);
  scene.add(new THREE.HemisphereLight(0xbadce8, 0x294644, 0.8));
  const moon = new THREE.DirectionalLight(0xbbddff, 0.95);
  moon.position.set(-5, 14, 8); moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
  moon.shadow.bias = -0.001; scene.add(moon);
  const warm = new THREE.PointLight(0xffb95c, 0.9, 18); warm.position.set(3, 5, 3); scene.add(warm);
  const mat = (color, glow = false) => new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.85,
    ...(glow ? { emissive: new THREE.Color(color).convertSRGBToLinear(), emissiveIntensity: 1.5 } : {}),
  });
  const m = { land: mat(0x365854), edge: mat(0x233f46), path: mat(0x739185), teal: mat(0x4faba1),
    blue: mat(0x687ca3), pink: mat(0xbf858b), cream: mat(0xbfc7ad), roof: mat(0x315f68),
    green: mat(0x688670), trunk: mat(0x385650), amber: mat(0xffc477, true), dark: mat(0x122e38), rubble: mat(0x63777a) };
  function box(parent, x, y, z, w, h, d, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function hex(parent, radius, depth, y, material, sides = 6) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, sides), material);
    mesh.position.y = y; mesh.receiveShadow = true; mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  function glowPool(parent, x, z, radius) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), new THREE.MeshBasicMaterial({ color: 0xffc36a, transparent: true, opacity: 0.10, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.05, z); parent.add(mesh);
  }
  const city = new THREE.Group(); scene.add(city);
  hex(city, 7.1, 0.65, -0.42, m.edge);
  hex(city, 6.95, 0.16, -0.03, m.land);
  // Broad streets, inset gardens, and a luminous water channel.
  box(city, 0, 0.07, 0, 10.6, 0.04, 0.6, m.path);
  box(city, 0, 0.075, 0, 0.6, 0.04, 10.3, m.path);
  box(city, -4.3, 0.045, -0.4, 0.75, 0.03, 7.2, mat(0x367f88));
  for (const z of [-2.5, 2.5]) box(city, -4.3, 0.16, z, 1.35, 0.15, 0.65, m.cream);

  const buildings = [];
  function building(x, z, h, material, kind, damaged) {
    const lot = new THREE.Group(); lot.position.set(x, 0.12, z); city.add(lot);
    box(lot, 0, -0.02, 0, 1.9, 0.12, 1.75, m.path);
    const structure = new THREE.Group(); lot.add(structure);
    if (kind === 'arch') {
      for (const side of [-0.55, 0.55]) box(structure, side, h / 2, 0, 0.42, h, 1.15, material);
      box(structure, 0, h - 0.16, 0, 1.55, 0.5, 1.15, material);
      box(structure, 0, h + 0.14, 0, 1.65, 0.12, 1.25, m.teal);
    } else {
      box(structure, 0, h / 2, 0, 1.3, h, 1.25, material);
      box(structure, 0, h + 0.06, 0, 1.5, 0.16, 1.45, m.roof);
      for (let level = 0.45; level < h - 0.1; level += 0.63) {
        for (const side of [-0.34, 0.34]) {
          box(structure, side, level, 0.634, 0.16, 0.26, 0.022, m.amber);
          box(structure, 0.659, level, side, 0.022, 0.26, 0.16, m.amber);
        }
      }
    }
    if (kind === 'tower') {
      for (const x of [-0.52, 0.52]) for (const z of [-0.5, 0.5]) box(structure, x, h + 0.65, z, 0.11, 1.2, 0.11, m.cream);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.85, 4), m.pink);
      crown.rotation.y = Math.PI / 4; crown.position.y = h + 1.45; structure.add(crown);
      const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), m.amber); lamp.position.y = h + 0.6; structure.add(lamp);
    }
    const rubble = new THREE.Group(); lot.add(rubble); rubble.visible = false;
    for (let i = 0; i < 5; i++) {
      const piece = box(rubble, Math.sin(i * 4) * 0.55, 0.18 + (i % 2) * 0.16, Math.cos(i * 3) * 0.45, 0.5, 0.3 + (i % 3) * 0.15, 0.48, i % 2 ? material : m.rubble);
      piece.rotation.set(i * 0.13, i * 0.8, i * 0.12);
    }
    // One lot clears completely; another retains a broken facade.
    const empty = buildings.length === 6;
    if (buildings.length === 3) box(rubble, -0.5, 0.55, -0.4, 0.22, 1.1, 1.05, material);
    buildings.push({ structure, rubble, damaged, empty, delay: buildings.length * 0.08 });
  }
  building(-1.55, -2.5, 2.6, m.blue, 'tower', true);
  building(1.5, -2.5, 2.0, m.cream, 'arch', false);
  building(3.7, -1.6, 2.6, m.teal, 'tower', true);
  building(-2, 1.7, 1.55, m.cream, 'house', true);
  building(0.6, 2.2, 2.3, m.pink, 'house', true);
  building(3.15, 1.8, 1.3, m.teal, 'house', false);
  building(-1.25, 4.1, 1, m.teal, 'arch', true);
  // Monumental stepped walkway and a quiet garden.
  for (let i = 0; i < 7; i++) box(city, 1.4 + i * 0.23, 0.13 + i * 0.105, -4.15, 0.25, 0.2 + i * 0.21, 0.85, m.cream);
  for (let i = 0; i < 19; i++) {
    const a = i * 2.399, r = 4.8 + (i % 3) * 0.3, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 0.6 || Math.abs(z) < 0.6) continue;
    box(city, x, 0.3, z, 0.1, 0.6, 0.1, m.trunk);
    const tree = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.3, 5), m.green);
    tree.position.set(x, 0.98, z); tree.castShadow = true; city.add(tree);
  }
  for (const [x, z] of [[-3, 0.5], [0.5, -3.7], [3.8, 0.5], [0.5, 4.5]]) {
    box(city, x, 0.5, z, 0.065, 1, 0.065, m.dark);
    box(city, x, 1.05, z, 0.19, 0.27, 0.19, m.amber); glowPool(city, x, z, 0.9);
  }

  const avatar = new THREE.Group(); scene.add(avatar);
  hex(avatar, 2.5, 0.55, -0.32, m.edge);
  hex(avatar, 2.47, 0.12, 0, m.land);
  const creature = new THREE.Group(); avatar.add(creature);
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(1.0), m.teal);
  body.scale.set(1, 1.18, 0.8); body.rotation.y = Math.PI / 4; creature.add(body);
  // Two luminous insets in a faceted core, with an oversized architect's cap.
  box(creature, 0, 0.14, 0.64, 0.75, 0.3, 0.08, m.dark);
  box(creature, -0.2, 0.14, 0.69, 0.12, 0.13, 0.04, m.amber);
  box(creature, 0.2, 0.14, 0.69, 0.12, 0.13, 0.04, m.amber);
  box(creature, 0, 0.83, 0, 1.75, 0.17, 1.45, m.cream);
  box(creature, -0.05, 1.04, -0.06, 1.12, 0.3, 1.0, m.cream);
  box(creature, 0.08, 1.2, 0, 0.17, 0.12, 1.08, m.amber);
  const satellite = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), m.teal); creature.add(satellite);
  satellite.position.set(-1.35, -0.15, 0.15);
  const plan = box(creature, 1.18, -0.38, 0.35, 0.95, 0.07, 0.7, m.blue); plan.rotation.z = 0.25;
  for (let i = 0; i < 3; i++) box(plan, -0.2 + i * 0.2, 0.042, 0, 0.02, 0.01, 0.5, m.cream);
  glowPool(avatar, 0, 0, 1.9);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.016, 6, 64), m.amber);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; avatar.add(ring);

  const blueprint = new THREE.Group(); scene.add(blueprint);
  hex(blueprint, 3.7, 0.5, -0.3, m.edge);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x9cddd0, transparent: true, opacity: 0.6 });
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4, 2.4, 4)), lineMat);
  outline.position.y = 1.25; blueprint.add(outline);
  for (let i = 0; i <= 4; i++) {
    box(blueprint, i - 2, 0.02, 0, 0.018, 0.02, 4, m.teal);
    box(blueprint, 0, 0.02, i - 2, 4, 0.02, 0.018, m.teal);
  }
  const fill = new THREE.Group(); blueprint.add(fill);
  for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) for (let y = 0; y < 3; y++) {
    if ((x + z + y) % 7 === 0) continue;
    const tile = box(fill, x - 1.5, y * 0.8 + 0.43, z - 1.5, 0.95, 0.75, 0.95, [m.teal, m.cream, m.blue][y]);
    tile.userData.order = y * 16 + x * 4 + z;
  }
  const stars = new THREE.BufferGeometry();
  const points = [];
  for (let i = 0; i < 75; i++) points.push(Math.sin(i * 73) * 17, 2 + (i % 13), Math.cos(i * 37) * 17);
  stars.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xe2d6a9, size: 0.035, transparent: true, opacity: 0.45 })));

  let step = 0, elapsed = 0, time = 0, width = 0, height = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  return {
    setStep(value) { step = value; elapsed = 0; },
    render(dt) {
      elapsed += dt; time += dt;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w !== width || h !== height) { width = w; height = h; renderer.setSize(w, h, false); }
      const isAvatar = step < 2, isBlueprint = step === 6 || step === 7 || step === 9;
      avatar.visible = isAvatar; city.visible = !isAvatar && !isBlueprint; blueprint.visible = isBlueprint;
      const span = isAvatar ? 4.2 : isBlueprint ? 5.5 : 7.8;
      const aspect = w / Math.max(1, h);
      camera.left = -span * Math.max(1, aspect); camera.right = -camera.left;
      camera.top = span * Math.max(1, 1 / aspect); camera.bottom = -camera.top;
      camera.updateProjectionMatrix();
      camera.position.set(13, 12, 16); camera.lookAt(0, isAvatar ? 1.1 : 0.7, 0);
      creature.position.y = 1.75 + (reduced.matches ? 0 : Math.sin(time * 1.6) * 0.12);
      creature.rotation.y = -0.18 + (reduced.matches ? 0 : Math.sin(time * 0.6) * 0.08);
      for (const b of buildings) {
        const collapse = !b.damaged || step < 3 ? 0 : step > 3 || reduced.matches ? 1 : THREE.MathUtils.clamp((elapsed - b.delay - 0.25) / 1.3, 0, 1);
        b.structure.scale.y = 1 - collapse * 0.94;
        b.structure.rotation.z = collapse * 0.16;
        b.structure.visible = collapse < 1;
        b.rubble.visible = collapse > 0.4 && !b.empty;
        b.rubble.scale.setScalar(Math.min(1, collapse * 1.7));
      }
      city.position.set(0, 0, 0);
      if (step === 3 && elapsed < 2.5 && !reduced.matches) {
        const amount = 0.1 * Math.sin(Math.min(1, elapsed / 2.5) * Math.PI);
        city.position.set(Math.sin(elapsed * 75) * amount, Math.cos(elapsed * 58) * amount, 0);
      }
      fill.children.forEach(tile => { tile.visible = step === 7 && (reduced.matches || tile.userData.order < (elapsed % 6) * 15); });
      blueprint.rotation.y = -0.1;
      renderer.render(scene, camera);
    },
  };
}
