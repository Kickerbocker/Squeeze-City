import { describe, expect, it } from 'vitest';
import { createRng, dayRng, hashSeed, STREAM } from '../src/sim/rng';

const draws = (seed: number, n: number) => {
  const r = createRng(seed);
  return Array.from({ length: n }, () => r.next());
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const variance = (xs: number[]) => {
  const m = mean(xs);
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length;
};

describe('rng', () => {
  it('same seed gives the same sequence', () => {
    expect(draws(42, 100)).toEqual(draws(42, 100));
  });

  it('different seeds give different sequences', () => {
    expect(draws(1, 10)).not.toEqual(draws(2, 10));
  });

  it('matches the reference mulberry32 output', () => {
    // Reference values from the canonical mulberry32 implementation, seed 1.
    const r = createRng(1);
    expect(r.next()).toBeCloseTo(0.6270739405881613, 12);
    expect(r.next()).toBeCloseTo(0.002735721180215478, 12);
  });

  it('resumes from a saved state', () => {
    const a = createRng(7);
    for (let i = 0; i < 25; i++) a.next();
    const b = createRng(a.state());
    expect(Array.from({ length: 10 }, () => b.next())).toEqual(Array.from({ length: 10 }, () => a.next()));
  });

  it('keeps values in range', () => {
    const r = createRng(9);
    for (let i = 0; i < 5000; i++) {
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const k = r.int(3, 7);
      expect(Number.isInteger(k)).toBe(true);
      expect(k).toBeGreaterThanOrEqual(3);
      expect(k).toBeLessThanOrEqual(7);
      const f = r.float(-2, 5);
      expect(f).toBeGreaterThanOrEqual(-2);
      expect(f).toBeLessThan(5);
    }
  });

  it('int covers both ends', () => {
    const r = createRng(11);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(r.int(1, 4));
    expect([...seen].sort()).toEqual([1, 2, 3, 4]);
  });

  it('normal has the right mean and variance', () => {
    const r = createRng(3);
    const xs = Array.from({ length: 20000 }, () => r.normal(5, 2));
    expect(mean(xs)).toBeCloseTo(5, 1);
    expect(Math.sqrt(variance(xs))).toBeCloseTo(2, 1);
  });

  it('logNormal has median about 1', () => {
    const r = createRng(4);
    const xs = Array.from({ length: 20001 }, () => r.logNormal(0.25)).sort((a, b) => a - b);
    expect(xs[10000]!).toBeCloseTo(1, 1);
    expect(xs.every((x) => x > 0)).toBe(true);
  });

  it('poisson has mean ≈ variance ≈ lambda (small and large means)', () => {
    for (const lambda of [0.3, 4, 60]) {
      const r = createRng(5);
      const xs = Array.from({ length: 20000 }, () => r.poisson(lambda));
      expect(mean(xs)).toBeCloseTo(lambda, lambda > 10 ? 0 : 1);
      expect(variance(xs) / lambda).toBeGreaterThan(0.9);
      expect(variance(xs) / lambda).toBeLessThan(1.1);
      expect(xs.every((x) => Number.isInteger(x) && x >= 0)).toBe(true);
    }
    expect(createRng(1).poisson(0)).toBe(0);
  });

  it('weighted respects proportions', () => {
    const r = createRng(6);
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 30000; i++) counts[r.weighted({ a: 1, b: 2, c: 0 })]++;
    expect(counts.c).toBe(0);
    expect(counts.b / counts.a).toBeGreaterThan(1.85);
    expect(counts.b / counts.a).toBeLessThan(2.15);
    expect(() => r.weighted({ a: 0 })).toThrow();
  });

  it('chance respects probability', () => {
    const r = createRng(8);
    let hits = 0;
    for (let i = 0; i < 20000; i++) if (r.chance(0.3)) hits++;
    expect(hits / 20000).toBeCloseTo(0.3, 1);
  });

  it('day streams are deterministic and independent', () => {
    expect(dayRng(1, 5, STREAM.weather).next()).toBe(dayRng(1, 5, STREAM.weather).next());
    expect(dayRng(1, 5, STREAM.weather).next()).not.toBe(dayRng(1, 6, STREAM.weather).next());
    expect(dayRng(1, 5, STREAM.weather).next()).not.toBe(dayRng(1, 5, STREAM.prices).next());
    expect(hashSeed(1, 2)).not.toBe(hashSeed(2, 1));
  });
});
