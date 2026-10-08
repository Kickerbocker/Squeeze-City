import { describe, expect, it } from 'vitest';
import { CONFIG as C } from '../src/config';
import {
  addStock,
  driftPrices,
  emptyInventory,
  expiredLemons,
  iceMeltFraction,
  inventoryValue,
  lemonCount,
  meltIce,
  packCost,
  spoilLemons,
  takeBulk,
  takeLemons,
} from '../src/sim/inventory';
import { createRng } from '../src/sim/rng';

describe('inventory (GDD §5)', () => {
  it('pack cost applies bulk discounts', () => {
    expect(packCost('lemons', 0, 1, 1, C)).toBeCloseTo(3.6);
    expect(packCost('lemons', 1, 1, 1, C)).toBeCloseTo(48 * 0.3 * 0.9);
    expect(packCost('lemons', 2, 1, 1, C)).toBeCloseTo(144 * 0.3 * 0.8);
    expect(packCost('cups', 0, 1.1, 1, C)).toBeCloseTo(50 * 0.04 * 1.1);
    expect(packCost('lemons', 0, 1, 1.6, C)).toBeCloseTo(3.6 * 1.6);
  });

  it('uses lemons oldest first and tracks cost', () => {
    const inv = emptyInventory();
    addStock(inv, 'lemons', 10, 3, 1);
    addStock(inv, 'lemons', 10, 4, 2);
    expect(lemonCount(inv)).toBe(20);
    expect(takeLemons(inv, 12)).toBeCloseTo(10 * 0.3 + 2 * 0.4);
    expect(inv.lemons).toEqual([{ day: 2, qty: 8, unitCost: 0.4 }]);
    expect(() => takeLemons(inv, 9)).toThrow();
  });

  it('bulk stock uses average cost', () => {
    const inv = emptyInventory();
    addStock(inv, 'sugar', 10, 1.5, 1);
    addStock(inv, 'sugar', 10, 2.5, 1);
    expect(takeBulk(inv.sugar, 5)).toBeCloseTo(1);
    expect(inv.sugar.qty).toBe(15);
    expect(inventoryValue(inv)).toBeCloseTo(3);
  });

  it('ice melts (3 + max(0, temp − 70)/10)% per hour, halved by the Cooler', () => {
    expect(iceMeltFraction(60, 1, C)).toBeCloseTo(0.03);
    expect(iceMeltFraction(90, 1, C)).toBeCloseTo(0.05);
    expect(iceMeltFraction(90, 0.5, C)).toBeCloseTo(0.025);
    const inv = emptyInventory();
    addStock(inv, 'ice', 1000, 10, 1);
    expect(meltIce(inv, 0.05)).toBeCloseTo(0.5);
    expect(inv.ice.qty).toBe(950);
  });

  it('lemons spoil after 6 days', () => {
    const inv = emptyInventory();
    addStock(inv, 'lemons', 12, 3.6, 1);
    addStock(inv, 'lemons', 12, 3.6, 3);
    expect(expiredLemons(inv, 5, 6)).toBe(0);
    expect(expiredLemons(inv, 6, 6)).toBe(12);
    const sp = spoilLemons(inv, 6, 6);
    expect(sp.qty).toBe(12);
    expect(sp.value).toBeCloseTo(3.6);
    expect(lemonCount(inv)).toBe(12);
    expect(spoilLemons(inv, 8, 12).qty).toBe(0); // Fridge
  });

  it('prices drift ±5% within [0.75, 1.35]', () => {
    const rng = createRng(1);
    let d = { lemons: 1, sugar: 1, ice: 1, cups: 1 };
    for (let i = 0; i < 2000; i++) {
      const next = driftPrices(d, rng, C);
      for (const k of ['lemons', 'sugar', 'ice', 'cups'] as const) {
        expect(next[k] / d[k]).toBeGreaterThanOrEqual(0.95 - 1e-9 - (d[k] <= 0.75 ? 1 : 0));
        expect(next[k]).toBeGreaterThanOrEqual(0.75);
        expect(next[k]).toBeLessThanOrEqual(1.35);
      }
      d = next;
    }
  });
});
