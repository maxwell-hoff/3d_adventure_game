// Small deterministic RNG helpers so world + map stay in sync across refreshes.

export function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringToUint32(str) {
  // FNV-1a
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seed = "default") {
  const s = typeof seed === "number" ? seed : hashStringToUint32(String(seed));
  const rand = mulberry32(s);
  return {
    seed: s,
    rand,
    float(min = 0, max = 1) {
      return min + (max - min) * rand();
    },
    int(minInclusive, maxInclusive) {
      const r = rand();
      return Math.floor(minInclusive + r * (maxInclusive - minInclusive + 1));
    },
    pick(arr) {
      return arr[Math.floor(rand() * arr.length)];
    }
  };
}


