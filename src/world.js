// World generation. Returns structured data used by both the 3D scene and the 2D map.

import * as THREE from "three";

function v2(x, z) {
  return { x, z };
}

function addPathSegment(scene, pathMat, x, z, w, l, rotY = 0) {
  const seg = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, l), pathMat);
  seg.position.set(x, 0.04, z);
  seg.rotation.y = rotY;
  scene.add(seg);
  return seg;
}

function addTree(scene, mats, x, z, s = 1) {
  const { trunkMat, leafMat } = mats;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.22 * s, 1.4 * s, 10), trunkMat);
  trunk.position.set(x, 0.7 * s, z);

  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.0 * s, 2.2 * s, 10), leafMat);
  canopy.position.set(x, 2.0 * s, z);

  const hi = new THREE.Mesh(
    new THREE.SphereGeometry(0.45 * s, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 1.0 })
  );
  hi.position.set(x - 0.35 * s, 2.2 * s, z - 0.25 * s);

  scene.add(trunk, canopy, hi);
}

function addLandmarks(scene) {
  const landmarks = [];

  // 1) Stone ring
  {
    const name = "Stone Ring";
    const x = -120, z = -80;
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6c717a, roughness: 1.0, metalness: 0.0 });
    for (let i = 0; i < 11; i++) {
      const ang = (i / 11) * Math.PI * 2;
      const r = 7.5;
      const sx = x + Math.cos(ang) * r;
      const sz = z + Math.sin(ang) * r;
      const h = 2.0 + (i % 3) * 0.5;
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, h, 8), stoneMat);
      stone.position.set(sx, h / 2, sz);
      stone.rotation.y = ang * 0.7;
      group.add(stone);
    }
    scene.add(group);
    landmarks.push({ id: "stone_ring", name, type: "stone", x, z });
  }

  // 2) Pond (shallow water disc)
  {
    const name = "Pond";
    const x = 110, z = 90;
    const geo = new THREE.CircleGeometry(11, 48);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1d3d66,
      roughness: 0.15,
      metalness: 0.0,
      emissive: 0x0b1f33,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.85
    });
    const pond = new THREE.Mesh(geo, mat);
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(x, 0.02, z);
    scene.add(pond);
    landmarks.push({ id: "pond", name, type: "water", x, z });
  }

  // 3) Watch Rock
  {
    const name = "Watch Rock";
    const x = -140, z = 120;
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x61666f, roughness: 0.95 });
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(5.0, 0), rockMat);
    rock.position.set(x, 3.4, z);
    rock.rotation.set(0.2, 0.6, -0.1);
    scene.add(rock);
    landmarks.push({ id: "watch_rock", name, type: "rock", x, z });
  }

  // 4) Lone dead tree (easy silhouette)
  {
    const name = "Dead Tree";
    const x = 150, z = -110;
    const mat = new THREE.MeshStandardMaterial({ color: 0x3e2a1c, roughness: 1.0 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 5.2, 8), mat);
    trunk.position.set(x, 2.6, z);
    const branch1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.6, 6), mat);
    branch1.position.set(x + 0.8, 4.0, z);
    branch1.rotation.z = -0.9;
    const branch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.18, 2.2, 6), mat);
    branch2.position.set(x - 0.7, 3.6, z - 0.4);
    branch2.rotation.z = 0.85;
    scene.add(trunk, branch1, branch2);
    landmarks.push({ id: "dead_tree", name, type: "tree", x, z });
  }

  return landmarks;
}

export function createWorld({
  scene,
  rng,
  worldSize = 500,
  bounds = 240
}) {
  // --- Ground ---
  const groundGeo = new THREE.PlaneGeometry(worldSize, worldSize, 1, 1);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 1.0 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = false;
  scene.add(ground);

  // Subtle ground patches
  const patches = [];
  function addPatch(x, z, r, color) {
    const g = new THREE.CircleGeometry(r, 24);
    const m = new THREE.MeshStandardMaterial({ color, roughness: 1.0 });
    const p = new THREE.Mesh(g, m);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.01, z);
    scene.add(p);
    patches.push({ x, z, r, color });
  }
  for (let i = 0; i < 70; i++) {
    addPatch(
      (rng.rand() - 0.5) * 350,
      (rng.rand() - 0.5) * 350,
      6 + rng.rand() * 14,
      0x2b5f34
    );
  }

  // --- Paths ---
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xa58b5a, roughness: 1.0 });
  const paths = [];

  function carvePath({ startX, startZ, steps, stepLen, width = 5.0, turnChance = 0.12 }) {
    let x = startX, z = startZ;
    let ang = rng.rand() * Math.PI * 2;
    const poly = [v2(x, z)];
    for (let i = 0; i < steps; i++) {
      if (rng.rand() < turnChance) ang += (rng.rand() - 0.5) * 1.2;
      const nx = x + Math.cos(ang) * stepLen;
      const nz = z + Math.sin(ang) * stepLen;

      const midX = (x + nx) / 2;
      const midZ = (z + nz) / 2;
      const rot = Math.atan2(nz - z, nx - x);
      addPathSegment(scene, pathMat, midX, midZ, width, stepLen + 0.5, -rot);

      x = nx; z = nz;
      poly.push(v2(x, z));
    }
    paths.push({ width, points: poly });
  }

  carvePath({ startX: -60, startZ: 20, steps: 75, stepLen: 7, width: 5.0 });
  carvePath({ startX: 40, startZ: -30, steps: 75, stepLen: 7, width: 5.0 });
  carvePath({ startX: 0, startZ: 0, steps: 55, stepLen: 8, width: 5.2 });

  // --- Trees ---
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b3a22, roughness: 1.0 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f4f2c, roughness: 1.0 });

  function nearCorridor(x, z) {
    // Keep a few clear-ish corridors around the path start areas (a readability hack).
    const corridors = [
      { x: -60, z: 20, r: 22 },
      { x: 40, z: -30, r: 22 },
      { x: 0, z: 0, r: 20 }
    ];
    for (const c of corridors) {
      const dx = x - c.x, dz = z - c.z;
      if ((dx * dx + dz * dz) < (c.r * c.r)) return true;
    }
    return false;
  }

  const treeCount = 650;
  for (let i = 0; i < treeCount; i++) {
    const x = (rng.rand() - 0.5) * 360;
    const z = (rng.rand() - 0.5) * 360;
    if (nearCorridor(x, z) && rng.rand() < 0.75) continue;
    addTree(scene, { trunkMat, leafMat }, x, z, 0.75 + rng.rand() * 0.9);
  }

  // --- Landmarks (important for navigation + map) ---
  const landmarks = addLandmarks(scene);

  return {
    bounds,
    patches,
    paths,
    landmarks
  };
}


