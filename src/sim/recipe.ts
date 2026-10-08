import type { GameConfig } from '../config';
import type { Bubble, Recipe } from './types';
import { clamp } from './util';

export interface QualityBreakdown {
  q: number;
  taste: number;
  iceScore: number;
  sourDiff: number;
  sweetDiff: number;
  idealIce: number;
}

/** GDD §6: I* = clamp(round((temp − 45)/8), 0, 8). */
export function idealIce(temp: number, cfg: GameConfig): number {
  const i = cfg.recipe.idealIce;
  return clamp(Math.round((temp - i.refTemp) / i.degreesPerCube), i.min, i.max);
}

export function idealSugar(sweetShift: number, cfg: GameConfig): number {
  return cfg.recipe.idealSugarBase + sweetShift;
}

export function sourDiff(lemons: number, cfg: GameConfig): number {
  return (lemons - cfg.recipe.idealLemons) / cfg.recipe.sourScale;
}

export function sweetDiff(sugar: number, sweetShift: number, cfg: GameConfig): number {
  return (sugar - idealSugar(sweetShift, cfg)) / cfg.recipe.sweetScale;
}

/** GDD §6: taste = exp(−(sourDiff² + sweetDiff²)). */
export function tasteScore(lemons: number, sugar: number, sweetShift: number, cfg: GameConfig): number {
  const a = sourDiff(lemons, cfg);
  const b = sweetDiff(sugar, sweetShift, cfg);
  return Math.exp(-(a * a + b * b));
}

/** GDD §6: iceScore = exp(−((I − I*)/2.5)²). */
export function iceScore(ice: number, ideal: number, cfg: GameConfig): number {
  const d = (ice - ideal) / cfg.recipe.iceScale;
  return Math.exp(-d * d);
}

/**
 * Quality Q = 0.7·taste + 0.3·iceScore for one archetype at one temperature.
 * `effectiveIce` is the ice actually in the cup (0 if the ice ran out).
 */
export function quality(recipe: Recipe, effectiveIce: number, sweetShift: number, temp: number, cfg: GameConfig): QualityBreakdown {
  const ideal = idealIce(temp, cfg);
  const taste = tasteScore(recipe.lemons, recipe.sugar, sweetShift, cfg);
  const ice = iceScore(effectiveIce, ideal, cfg);
  return {
    q: cfg.recipe.tasteWeight * taste + cfg.recipe.iceWeight * ice,
    taste,
    iceScore: ice,
    sourDiff: sourDiff(recipe.lemons, cfg),
    sweetDiff: sweetDiff(recipe.sugar, sweetShift, cfg),
    idealIce: ideal,
  };
}

/**
 * Recipe complaints that trigger (GDD §6 table), most severe first.
 * Severity compares each deviation in its own formula units.
 */
export function recipeComplaints(qb: QualityBreakdown, effectiveIce: number, cfg: GameConfig): Bubble[] {
  const c = cfg.recipe.complaints;
  const hits: [Bubble, number][] = [];
  if (qb.sourDiff > c.tooSour) hits.push(['tooSour', Math.abs(qb.sourDiff)]);
  if (qb.sourDiff < c.tooWeak) hits.push(['tooWeak', Math.abs(qb.sourDiff)]);
  if (qb.sweetDiff > c.tooSweet) hits.push(['tooSweet', Math.abs(qb.sweetDiff)]);
  if (qb.sweetDiff < c.notSweet) hits.push(['notSweet', Math.abs(qb.sweetDiff)]);
  const iceDev = (effectiveIce - qb.idealIce) / cfg.recipe.iceScale;
  if (effectiveIce < qb.idealIce - c.notColdBelow) hits.push(['notCold', Math.abs(iceDev)]);
  if (effectiveIce > qb.idealIce + c.tooMuchIceAbove) hits.push(['tooMuchIce', Math.abs(iceDev)]);
  return hits.sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

export function validRecipe(r: Recipe, cfg: GameConfig): boolean {
  const c = cfg.recipe;
  const ok = (v: number, range: { min: number; max: number }) => Number.isInteger(v) && v >= range.min && v <= range.max;
  return ok(r.lemons, c.lemons) && ok(r.sugar, c.sugar) && ok(r.ice, c.ice);
}

export function validPrice(price: number, cfg: GameConfig): boolean {
  const p = cfg.recipe.price;
  const steps = price / p.step;
  return Number.isFinite(price) && price >= p.min && price <= p.max && Math.abs(steps - Math.round(steps)) < 1e-6;
}
