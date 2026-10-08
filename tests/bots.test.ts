import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { runBot } from '../scripts/balance';

describe('balance bots', () => {
  it('Sensible bot runs deterministically and stays solvent', () => {
    const a = runBot(1, 20, { name: 'Sensible', expand: true }, CONFIG);
    const b = runBot(1, 20, { name: 'Sensible', expand: true }, CONFIG);
    expect(a.reports.map((r) => r.profit)).toEqual(b.reports.map((r) => r.profit));
    expect(a.minCash).toBeGreaterThanOrEqual(0);
    expect(a.netWorthAt(20)).toBeGreaterThan(100);
  });
});
