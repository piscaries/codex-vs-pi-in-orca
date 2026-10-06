// Seeded pseudo-random numbers (phase P2).
//
// Deterministic randomness is what makes the level checks and level play
// reproducible: the same seed always yields the same stream, on every machine,
// with no dependence on Math.random or timing. The generator is mulberry32 —
// tiny, fast, and good enough for choosing moves and shuffling candidates.

// Returns a function producing floats in [0, 1) from a 32-bit seed.
export function rng(seed) {
  let a = Number(seed) >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Uniform integer below n, derived from a rng() stream.
export function intBelow(random, n) {
  return Math.min(n - 1, Math.floor(random() * n));
}
