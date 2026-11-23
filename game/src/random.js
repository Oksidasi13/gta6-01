// Seeded random numbers (mulberry32). Every deterministic scene — screenshots, the
// staged missions, the autopilot — draws from one of these, so the same seed always
// rebuilds the same city and the same frame.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max]. */
export function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** One item from an array. */
export function pickFrom(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

/** Fisher-Yates shuffle, in place, driven by the seeded rng. */
export function shuffleWith(rng, items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}
