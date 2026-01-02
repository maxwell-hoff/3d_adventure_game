// Starfield / sky utilities
// Designed to be easy to extend later with patterns/constellations.

import * as THREE from "three";

function mulberry32(seed) {
  // Small, fast deterministic PRNG.
  // seed: uint32
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToUint32(str) {
  // FNV-1a
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Creates a star dome (THREE.Points) and an optional sky sphere behind it.
 * Both are set to ignore scene fog so they stay visible even with heavy fog.
 */
export function createStarSystem({
  seed = "default",
  starCount = 2600,
  radius = 900,
  // 0..1 : 0.5 is roughly hemisphere, higher pushes more stars upward.
  upperHemisphereBias = 0.9,
  starSize = 2.0,
  skyRadius = 950,
  skyColor = 0x04060a
} = {}) {
  const rand = mulberry32(typeof seed === "number" ? seed : hashStringToUint32(String(seed)));

  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const twinkle = new Float32Array(starCount); // stored for future use

  const c = new THREE.Color();
  for (let i = 0; i < starCount; i++) {
    // Random direction on a sphere, biased toward "up" (positive Y).
    // theta: 0..2pi
    // y: biased to be mostly positive
    const theta = rand() * Math.PI * 2;

    // y in [0..1], then bias it upward using a power curve.
    const y01 = Math.pow(rand(), 1.0 / Math.max(0.0001, upperHemisphereBias));
    const y = THREE.MathUtils.lerp(0.02, 1.0, y01); // keep above horizon a bit

    const rXZ = Math.sqrt(Math.max(0, 1 - y * y));
    const x = rXZ * Math.cos(theta);
    const z = rXZ * Math.sin(theta);

    positions[i * 3 + 0] = x * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = z * radius;

    // Color temperature-ish: subtle warm/cool variance.
    const t = rand();
    c.setRGB(
      THREE.MathUtils.lerp(0.85, 1.0, t),
      THREE.MathUtils.lerp(0.90, 1.0, t),
      THREE.MathUtils.lerp(0.95, 1.0, 1 - t)
    );
    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    twinkle[i] = rand();
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  starGeo.setAttribute("twinkle", new THREE.BufferAttribute(twinkle, 1));

  const starMat = new THREE.PointsMaterial({
    size: starSize,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });
  // Critical: don't let scene fog wipe out distant stars.
  starMat.fog = false;

  const stars = new THREE.Points(starGeo, starMat);
  stars.name = "StarDome";
  stars.frustumCulled = false;

  const skyGeo = new THREE.SphereGeometry(skyRadius, 32, 16);
  const skyMat = new THREE.MeshBasicMaterial({ color: skyColor, side: THREE.BackSide });
  skyMat.fog = false;
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = "SkySphere";

  // Container for future add-ons (constellations, labels, etc.).
  const group = new THREE.Group();
  group.name = "Sky";
  group.add(sky, stars);

  const api = {
    group,
    stars,
    sky,
    /**
     * Placeholder hook for future: animate twinkle / rotate sky.
     * Keep it simple for now.
     */
    update(dt) {
      stars.rotation.y += dt * 0.02;
    },
    /**
     * Extension point: add a constellation as line segments by passing points in world space.
     * This lets you grow into "patterns" without rewriting the starfield core.
     */
    addConstellation({ name = "Constellation", points = [], color = 0x9fb6ff, opacity = 0.7 } = {}) {
      if (!Array.isArray(points) || points.length < 2) return null;
      const g = new THREE.BufferGeometry().setFromPoints(points);
      const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      m.fog = false;
      const line = new THREE.Line(g, m);
      line.name = name;
      group.add(line);
      return line;
    }
  };

  return api;
}


