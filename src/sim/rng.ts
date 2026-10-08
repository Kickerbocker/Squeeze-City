// Seeded RNG (mulberry32). The whole sim draws randomness from here, never Math.random.

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform float in [min, max). */
  float(min: number, max: number): number;
  /** Uniform integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** Normal(mean, sd) via Box–Muller. */
  normal(mean?: number, sd?: number): number;
  /** exp(Normal(0, sigma)): a multiplicative noise factor with median 1. */
  logNormal(sigma: number): number;
  /** Poisson-distributed count with the given mean. */
  poisson(mean: number): number;
  /** Picks a key with probability proportional to its weight. */
  weighted<K extends string>(weights: Partial<Record<K, number>>): K;
  /** Picks a uniform element. */
  pick<T>(items: readonly T[]): T;
  /** Current internal state, for saving and resuming. */
  state(): number;
}

/** Creates a mulberry32 generator. `state` is a 32-bit integer. */
export function createRng(state: number): Rng {
  let s = state >>> 0;
  let spare: number | null = null;

  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const normal = (mean = 0, sd = 1): number => {
    if (spare !== null) {
      const z = spare;
      spare = null;
      return mean + sd * z;
    }
    let u = 0;
    while (u === 0) u = next();
    const v = next();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return mean + sd * r * Math.cos(2 * Math.PI * v);
  };

  return {
    next,
    float: (min, max) => min + (max - min) * next(),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    normal,
    logNormal: (sigma) => Math.exp(normal(0, sigma)),
    poisson: (mean) => {
      if (mean <= 0) return 0;
      if (mean > 30) {
        // Normal approximation keeps big means fast.
        return Math.max(0, Math.round(normal(mean, Math.sqrt(mean))));
      }
      const l = Math.exp(-mean);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= next();
      } while (p > l);
      return k - 1;
    },
    weighted<K extends string>(weights: Partial<Record<K, number>>): K {
      const entries = Object.entries(weights) as [K, number][];
      const total = entries.reduce((a, [, w]) => a + Math.max(0, w), 0);
      if (total <= 0 || entries.length === 0) throw new Error('weighted(): no positive weights');
      let r = next() * total;
      for (const [k, w] of entries) {
        r -= Math.max(0, w);
        if (r < 0) return k;
      }
      return entries[entries.length - 1]![0];
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('pick(): empty list');
      return items[Math.floor(next() * items.length)]!;
    },
    state: () => s,
  };
}

/** Mixes integers into a well-spread 32-bit seed (murmur3 finalizer). */
export function hashSeed(...parts: number[]): number {
  let h = 0x811c9dc5;
  for (const part of parts) {
    h = Math.imul(h ^ (part >>> 0), 0x01000193) >>> 0;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/** Independent random streams, so one system's draws never shift another's. */
export const STREAM = {
  weather: 1,
  forecast: 2,
  prices: 3,
  events: 4,
  customers: 5,
  staff: 6,
  stadium: 7,
  inspector: 8,
} as const;

/** A fresh generator for one stream on one day. */
export function dayRng(seed: number, day: number, stream: number, sub = 0): Rng {
  return createRng(hashSeed(seed, day, stream, sub));
}
