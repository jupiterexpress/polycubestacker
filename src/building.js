import * as THREE from 'three';

// Surface extraction retains every occupied cell, including setbacks, holes and overhangs.
// All architectural detail lies on those surfaces; nothing enlarges the silhouette.
const faces = [
  { n: [1,0,0], q: [[.5,0,-.5],[.5,1,-.5],[.5,1,.5],[.5,0,.5]], material: 0 },
  { n: [-1,0,0], q: [[-.5,0,.5],[-.5,1,.5],[-.5,1,-.5],[-.5,0,-.5]], material: 0 },
  { n: [0,1,0], q: [[-.5,1,.5],[.5,1,.5],[.5,1,-.5],[-.5,1,-.5]], material: 1 },
  { n: [0,-1,0], q: [[-.5,0,-.5],[.5,0,-.5],[.5,0,.5],[-.5,0,.5]], material: 0 },
  { n: [0,0,1], q: [[.5,0,.5],[.5,1,.5],[-.5,1,.5],[-.5,0,.5]], material: 0 },
  { n: [0,0,-1], q: [[-.5,0,-.5],[-.5,1,-.5],[.5,1,-.5],[.5,0,-.5]], material: 0 },
];
export function exterior(cells) {
  const keys = new Set(cells.map(c => c.join(','))), buckets = [{ positions: [], normals: [] },{ positions: [], normals: [] }], surfaces = [];
  const geometry = new THREE.BufferGeometry();
  for (const [x,y,z] of cells) for (const face of faces) {
    const [nx,ny,nz] = face.n;
    if (keys.has([x+nx,y+ny,z+nz].join(','))) continue;
    const { positions, normals } = buckets[face.material];
    for (const i of [0,1,2,0,2,3]) {
      const q = face.q[i]; positions.push(x+q[0],y+q[1],z+q[2]); normals.push(nx,ny,nz);
    }
    surfaces.push({ x,y,z,nx,ny,nz });
  }
  const positions = [], normals = [];
  buckets.forEach((bucket,index) => { geometry.addGroup(positions.length/3,bucket.positions.length/3,index); positions.push(...bucket.positions); normals.push(...bucket.normals); });
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingBox();
  return { geometry, surfaces, keys };
}

function facadeTexture(kind) {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 192;
  const g = canvas.getContext('2d');
  if (kind === 'lantern') {
    const glow = g.createRadialGradient(64, 85, 7, 64, 85, 63);
    glow.addColorStop(0, '#ffd991b0'); glow.addColorStop(.38, '#ffc15d38'); glow.addColorStop(1, '#ffb84e00');
    g.fillStyle = glow; g.fillRect(0, 0, 128, 192);
    g.fillStyle = '#233d41'; g.fillRect(51, 49, 26, 65); g.fillRect(44, 53, 40, 6); g.fillRect(44, 110, 40, 7);
    const light = g.createLinearGradient(52, 60, 76, 106);
    light.addColorStop(0, '#ffe6ae'); light.addColorStop(1, '#d58b39');
    g.fillStyle = light; g.fillRect(54, 61, 20, 46); g.fillStyle = '#6b5e42'; g.fillRect(63, 61, 2, 46);
  } else {
    g.fillStyle = '#23414a';
    const x = kind === 'door' ? 23 : 27, y = kind === 'door' ? 24 : 31;
    g.beginPath(); g.roundRect(x, y, 128-x*2, 192-y-12, [28,28,2,2]); g.fill();
    const glow = g.createLinearGradient(0, 50, 0, 160);
    glow.addColorStop(0, '#f6d69b'); glow.addColorStop(1, '#a88656'); g.fillStyle = glow;
    g.beginPath(); g.roundRect(x+9, y+10, 110-x*2, 146-y, [19,19,0,0]); g.fill();
    g.fillStyle = '#304b4e'; g.fillRect(61, y+10, 6, 146-y); g.fillRect(x+9, 95, 110-x*2, 5);
    g.fillStyle = '#d6ccb0'; g.fillRect(x-6, 176, 140-x*2, 6);
    if (kind === 'door') { g.fillStyle = '#294345'; g.fillRect(x+7, 127, 114-x*2, 48); g.fillStyle = '#eccb86'; g.fillRect(75, 134, 4, 5); }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.encoding = THREE.sRGBEncoding;
  return texture;
}

export function makeBuilding(cells, plan) {
  const { geometry, surfaces, keys } = exterior(cells);
  const group = new THREE.Group(), details = new THREE.Group();
  const clip = new THREE.Plane(new THREE.Vector3(0,-1,0), -1);
  const glowHeight = { value: -2 }, glowStrength = { value: 1 };
  const material = color => {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).convertSRGBToLinear(), roughness: .82,
      clippingPlanes: [clip], side: THREE.DoubleSide });
    m.onBeforeCompile = shader => {
      shader.uniforms.revealY = glowHeight; shader.uniforms.revealGlow = glowStrength;
      shader.vertexShader = 'varying float buildingY;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nbuildingY = (modelMatrix * vec4(position, 1.0)).y;');
      shader.fragmentShader = 'varying float buildingY; uniform float revealY; uniform float revealGlow;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, .66, .24) * pow(max(0.0, 1.0 - abs(buildingY - revealY) / .5), 2.0) * revealGlow * 1.8;');
    };
    return m;
  };
  const wall = material(plan.wall), roof = material(plan.roof);
  const shell = new THREE.Mesh(geometry, [wall,roof]); shell.castShadow = true; shell.receiveShadow = true;
  group.add(shell, details);
  const textures = ['window','door','lantern'].map(facadeTexture);
  const deco = textures.map(map => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, clippingPlanes: [clip], side: THREE.DoubleSide }));
  const planeGeo = new THREE.PlaneGeometry(1,1);
  const doorFace = surfaces.filter(f => f.y === 0 && f.ny === 0).sort((a,b) => b.nz-a.nz || Math.abs(a.x)-Math.abs(b.x) || b.z-a.z)[0];
  for (const f of surfaces) {
    if (f.ny !== 0) continue;
    const isDoor = f === doorFace;
    const tile = new THREE.Mesh(planeGeo, deco[isDoor ? 1 : 0]);
    tile.scale.set(isDoor ? .7 : .54, isDoor ? .95 : .78, 1);
    tile.position.set(f.x+f.nx*.5, f.y+.5, f.z+f.nz*.5);
    tile.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), new THREE.Vector3(f.nx,0,f.nz));
    tile.renderOrder = 2; details.add(tile);
    if (isDoor || (f.y === 0 && (f.x+f.z)%3 === 0)) {
      const lamp = new THREE.Mesh(planeGeo, deco[2]); lamp.quaternion.copy(tile.quaternion);
      lamp.scale.set(.6,.85,1); lamp.position.copy(tile.position);
      // An inset lantern on the wall, not a floating orb or a new silhouette.
      lamp.position.x += f.nz*.35; lamp.position.z -= f.nx*.35; lamp.position.y += .02;
      lamp.renderOrder = 3; details.add(lamp);
    }
  }
  const maxY = Math.max(...cells.map(c => c[1]+1));
  return {
    group, shell, keys, maxY, surfaces,
    reveal(t) { const y = -.2 + t*(maxY+.8); clip.constant = y; glowHeight.value = y-.12; glowStrength.value = t >= 1 ? 0 : 1; },
    dispose() { geometry.dispose(); planeGeo.dispose(); [wall,roof,...deco].forEach(m => m.dispose()); textures.forEach(t => t.dispose()); },
  };
}
