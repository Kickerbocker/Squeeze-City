import { describe, expect, it } from 'vitest';
import { CONFIG as C } from '../src/config';
import { iceScore, idealIce, quality, recipeComplaints, tasteScore, validPrice, validRecipe } from '../src/sim/recipe';

describe('recipe and quality (GDD §6)', () => {
  it('ideal ice = clamp(round((temp − 45)/8), 0, 8)', () => {
    expect(idealIce(45, C)).toBe(0);
    expect(idealIce(69, C)).toBe(3);
    expect(idealIce(90, C)).toBe(6);
    expect(idealIce(30, C)).toBe(0);
    expect(idealIce(130, C)).toBe(8);
  });

  it('taste = exp(−(sourDiff² + sweetDiff²)) with L* = 6, S* = 4 + shift', () => {
    expect(tasteScore(6, 4, 0, C)).toBeCloseTo(1);
    expect(tasteScore(6, 6, 2, C)).toBeCloseTo(1);
    expect(tasteScore(10, 4, 0, C)).toBeCloseTo(Math.exp(-1));
    expect(tasteScore(8, 7, 0, C)).toBeCloseTo(Math.exp(-(0.25 + 1)));
  });

  it('iceScore = exp(−((I − I*)/2.5)²)', () => {
    expect(iceScore(3, 3, C)).toBeCloseTo(1);
    expect(iceScore(0, 5, C)).toBeCloseTo(Math.exp(-4));
  });

  it('Q = 0.7·taste + 0.3·iceScore', () => {
    const qb = quality({ lemons: 8, sugar: 4, ice: 2 }, 2, 0, 69, C);
    expect(qb.idealIce).toBe(3);
    expect(qb.q).toBeCloseTo(0.7 * Math.exp(-0.25) + 0.3 * Math.exp(-((1 / 2.5) ** 2)));
    expect(quality({ lemons: 6, sugar: 4, ice: 3 }, 3, 0, 69, C).q).toBeCloseTo(1);
  });

  it('complaint triggers', () => {
    const c = (L: number, S: number, I: number, shift = 0, temp = 69) =>
      recipeComplaints(quality({ lemons: L, sugar: S, ice: I }, I, shift, temp, C), I, C);
    expect(c(6, 4, 3)).toEqual([]);
    expect(c(8, 4, 3)).toEqual([]); // sourDiff 0.5 is not > 0.5
    expect(c(9, 4, 3)).toEqual(['tooSour']);
    expect(c(3, 4, 3)).toEqual(['tooWeak']);
    expect(c(6, 6, 3)).toEqual(['tooSweet']); // sweetDiff 0.667
    expect(c(6, 2, 3)).toEqual(['notSweet']);
    expect(c(6, 4, 3, 2)).toEqual(['notSweet']); // kid wants 6
    expect(c(6, 4, 0, 0, 90)).toEqual(['notCold']); // I* = 6
    expect(c(6, 4, 7, 0, 69)).toEqual(['tooMuchIce']);
    expect(c(12, 1, 3)[0]).toBe('tooSour'); // most severe first
  });

  it('validates ranges', () => {
    expect(validRecipe({ lemons: 6, sugar: 4, ice: 3 }, C)).toBe(true);
    expect(validRecipe({ lemons: 0, sugar: 4, ice: 3 }, C)).toBe(false);
    expect(validRecipe({ lemons: 6, sugar: 4, ice: 9 }, C)).toBe(false);
    expect(validRecipe({ lemons: 6.5, sugar: 4, ice: 3 }, C)).toBe(false);
    expect(validPrice(1.25, C)).toBe(true);
    expect(validPrice(1.23, C)).toBe(false);
    expect(validPrice(0, C)).toBe(false);
  });
});
