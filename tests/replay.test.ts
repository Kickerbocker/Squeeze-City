import { describe, expect, it } from 'vitest';
import { buildTimeline, cashAt, passSampling, pitcherAt, posesAt, soldAt, stockAt } from '../src/game/replay';
import { newGame, runDay } from '../src/sim';
import { stockUp } from './helpers';

function day(seed = 3) {
  const s = stockUp(newGame(undefined, seed));
  return { s, ...runDay(s) };
}

describe('replay model', () => {
  it('builds a walker per arrival and matches the report', () => {
    const { events, report } = day();
    const tl = buildTimeline(events);
    const st = tl.stands.get(0)!;
    const sr = report.stands[0]!;
    expect(st.walkers).toHaveLength(sr.passersby);
    expect(st.serves).toHaveLength(sr.buyers);
    expect(tl.close).toBeGreaterThanOrEqual(540);
    expect(soldAt(st, tl.close)).toBe(sr.buyers);
  });

  it('final live cash equals open cash + revenue', () => {
    const { events, report } = day();
    const tl = buildTimeline(events);
    expect(cashAt(tl, tl.close)).toBeCloseTo(tl.openCash + report.revenue, 2);
    expect(cashAt(tl, 0)).toBeCloseTo(tl.openCash, 2);
  });

  it('queue never shows more than 12 and slots are ordered', () => {
    const { events } = day();
    const st = buildTimeline(events).stands.get(0)!;
    for (let t = 0; t < 540; t += 3) {
      const { poses } = posesAt(st, t);
      const q = poses.filter((p) => p.kind === 'queued');
      expect(q.length).toBeLessThanOrEqual(12);
      expect(q.map((p) => p.slot)).toEqual(q.map((_, i) => i));
    }
  });

  it('served customers show their bubble on the way out', () => {
    const { events } = day();
    const st = buildTimeline(events).stands.get(0)!;
    const w = st.walkers.find((x) => x.serveBubble)!;
    expect(w).toBeDefined();
    const { poses } = posesAt(st, w.tServe! + w.serveDur! + 1);
    expect(poses.find((p) => p.w === w)?.bubble).toBe(w.serveBubble);
  });

  it('stock decreases with sales and pitchers report progress', () => {
    const { s, events } = day();
    const tl = buildTimeline(events);
    const recipes = new Map(s.stands.map((x) => [x.id, x.recipe]));
    const start = stockAt(tl, 0, recipes);
    const mid = stockAt(tl, 300, recipes);
    expect(mid.cups).toBeLessThan(start.cups);
    expect(mid.lemons).toBeLessThanOrEqual(start.lemons);
    const st = tl.stands.get(0)!;
    const p = st.pitchers.find((x) => x.ready > x.t)!;
    expect(pitcherAt(st, (p.t + p.ready) / 2).preparing).toBe(true);
    expect(passSampling(st, tl.close)).toBeGreaterThanOrEqual(1);
  });
});

describe('live funnel', () => {
  it('ends equal to the report funnel', async () => {
    const { funnelAt } = await import('../src/game/replay');
    const { events, report } = day(12);
    const tl = buildTimeline(events);
    const f = funnelAt(tl.stands.get(0)!, tl.close + 1);
    const sr = report.stands[0]!;
    expect(f.passed).toBe(sr.passersby);
    expect(f.stopped).toBe(sr.stoppers);
    expect(f.bought).toBe(sr.buyers);
    expect(f.tooExpensive).toBe(sr.tooExpensive);
    expect(f.lineTooLong).toBe(sr.lostQueue);
    expect(f.soldOut).toBe(sr.lostSoldOut);
  });
});
