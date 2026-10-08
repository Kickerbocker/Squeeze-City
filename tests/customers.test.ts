import { describe, expect, it } from 'vitest';
import { CONFIG as C } from '../src/config';
import {
  archetypeShares,
  buyProbability,
  curveMean,
  drinkBubble,
  hourlyWeight,
  repFactor,
  satisfaction,
  stopProbability,
  willingnessToPay,
} from '../src/sim/customers';

const loc = (id: string) => C.locations.locations.find((l) => l.id === id)!;

describe('customer decision (GDD §7)', () => {
  it('repFactor = 0.5 + rep/100', () => {
    expect(repFactor(40, C)).toBeCloseTo(0.9);
    expect(repFactor(100, C)).toBeCloseTo(1.5);
  });

  it('P_stop = min(0.95, 0.25·appeal·repFactor·adFactor·W·T)', () => {
    const p = stopProbability({ appeal: 1.15, rep: 40, adFactor: 1.1, wThirst: 0.9, tThirst: 0.85, multiplier: 1 }, C);
    expect(p).toBeCloseTo(0.25 * 1.15 * 0.9 * 1.1 * 0.9 * 0.85);
    expect(stopProbability({ appeal: 2, rep: 100, adFactor: 1.6, wThirst: 1, tThirst: 1.8, multiplier: 2 }, C)).toBe(0.95);
  });

  it('WTP = base·(0.6 + 0.4·T)·(0.75 + 0.5·rep/100)·noise', () => {
    expect(willingnessToPay(1.75, 1, 50, 1, C)).toBeCloseTo(1.75 * 1 * 1);
    expect(willingnessToPay(2, 0.5, 0, 1.2, C)).toBeCloseTo(2 * 0.8 * 0.75 * 1.2);
  });

  it('P_buy = 1/(1 + exp(priceSens·6·(price/WTP − 1)))', () => {
    expect(buyProbability(1, 1, 1.6, C)).toBeCloseTo(0.5);
    expect(buyProbability(1.5, 1, 1, C)).toBeCloseTo(1 / (1 + Math.exp(3)));
    expect(buyProbability(0.5, 1, 1, C)).toBeGreaterThan(0.9);
  });

  it('sat = Q^qs · fairness · waitFactor', () => {
    const s = satisfaction(0.9, 1.3, 1.2, 1, 2, 4, C);
    expect(s.fairness).toBeCloseTo(1.2 / 1.2);
    expect(s.waitFactor).toBeCloseTo(0.75);
    expect(s.sat).toBeCloseTo(Math.pow(0.9, 1.3) * 1 * 0.75);
    expect(satisfaction(1, 1, 0.2, 1, 0, 4, C).fairness).toBeCloseTo(0.5 / 1.2);
    expect(satisfaction(1, 1, 1, 1, 100, 4, C).waitFactor).toBeCloseTo(0.5);
  });

  it('bubbles: delicious above 0.8, complaint below 0.4', () => {
    const s = (sat: number, fairness = 1, waitFactor = 1, qualityTerm = 1) => ({ sat, fairness, waitFactor, qualityTerm });
    expect(drinkBubble(s(0.85), [], C)).toBe('delicious');
    expect(drinkBubble(s(0.6), ['tooSour'], C)).toBeUndefined();
    expect(drinkBubble(s(0.3), ['tooSour', 'notCold'], C)).toBe('tooSour');
    expect(drinkBubble(s(0.3, 0.42, 0.9, 0.95), [], C)).toBe('overpriced');
    expect(drinkBubble(s(0.3, 1, 0.5, 0.9), [], C)).toBe('slowService');
  });

  it('hourly curve interpolates and normalizes', () => {
    const curve = C.customers.archetypes.office.hourly;
    expect(hourlyWeight(curve, 12, C)).toBeCloseTo(1);
    expect(hourlyWeight(curve, 14.5, C)).toBeCloseTo(0.65);
    expect(hourlyWeight(curve, 18, C)).toBeCloseTo(0.5);
    expect(curveMean([1, 1, 1, 1, 1, 1, 1, 1, 1, 1])).toBeCloseTo(1);
    expect(curveMean([0, 1, 1, 1, 1, 1, 1, 1, 1, 0])).toBeCloseTo(8 / 9);
  });

  it('archetype shares: kids weekend-heavy, fans only on game days', () => {
    const wk = archetypeShares(loc('maple'), false, false, C);
    expect(wk.kid).toBeCloseTo(0.35);
    const we = archetypeShares(loc('maple'), true, false, C);
    expect(we.kid).toBeGreaterThan(0.35);
    expect(Object.values(we).reduce((a, b) => a + b!, 0)).toBeCloseTo(1);
    const plain = archetypeShares(loc('stadium'), false, false, C);
    expect(plain.fan).toBeUndefined();
    expect(plain.student).toBeCloseTo(0.5);
    expect(archetypeShares(loc('stadium'), false, true, C).fan).toBeCloseTo(0.7);
  });
});
