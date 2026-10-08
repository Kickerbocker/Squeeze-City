import { describe, expect, it } from 'vitest';
import { dispatch, type GameState, newGame, runDay, type SimEvent } from '../src/sim';
import { lemonCount } from '../src/sim/inventory';
import { buy, stockUp } from './helpers';

function play(seed: number, days: number) {
  let s = newGame(undefined, seed);
  const out: { report: unknown; events: number; state: GameState }[] = [];
  for (let d = 0; d < days; d++) {
    if (s.cash > 20) s = stockUp(s);
    const r = runDay(s, { stands: { 0: { price: 1 } } });
    out.push({ report: r.report, events: r.events.length, state: r.state });
    s = r.state;
  }
  return out;
}

describe('runDay', () => {
  it('30 seeded days give identical output every time', () => {
    const a = play(123, 30);
    const b = play(123, 30);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = play(124, 30);
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(a));
  });

  it('does not mutate its input', () => {
    const s = stockUp(newGame(undefined, 1));
    const snap = JSON.stringify(s);
    runDay(s);
    expect(JSON.stringify(s)).toBe(snap);
  });

  it('with no stock everyone who stops leaves sold out', () => {
    const r = runDay(newGame(undefined, 2));
    const sr = r.report.stands[0]!;
    expect(sr.buyers).toBe(0);
    expect(sr.stoppers).toBeGreaterThan(0);
    expect(sr.lostSoldOut).toBe(sr.stoppers);
    expect(sr.soldOutAt).toBe(0);
    expect(r.report.revenue).toBe(0);
    expect(sr.repAfter).toBeLessThan(sr.repBefore);
  });

  it('cash reconciles: start − morning spend + revenue − rent − wages − fines + bonuses', () => {
    let s = newGame(undefined, 3);
    for (let d = 0; d < 20; d++) {
      s = stockUp(s);
      const r = runDay(s).report;
      const bonuses = r.milestones.reduce((a, m) => a + m.bonus, 0);
      const expected = r.cashStart - r.stockBought - r.capitalSpent - r.costs.ads + r.revenue - r.costs.rent - r.costs.wages - r.costs.fines + bonuses;
      expect(r.cashEnd).toBeCloseTo(expected, 2);
      s = runDay(s).state;
    }
  });

  it('funnel counts are consistent', () => {
    const s = stockUp(newGame(undefined, 4));
    const { report, events } = runDay(s);
    const sr = report.stands[0]!;
    expect(sr.stoppers).toBe(sr.buyers + sr.lostQueue + sr.lostSoldOut + sr.tooExpensive);
    expect(events.filter((e) => e.k === 'arrive').length).toBe(sr.passersby);
    expect(events.filter((e) => e.k === 'serve').length).toBe(sr.buyers);
    expect(sr.hourlySales.reduce((a, b) => a + b)).toBe(sr.buyers);
    expect(report.revenue).toBeCloseTo(sr.buyers * 1);
  });

  it('events are in time order and every queued customer is served or quits', () => {
    const s = stockUp(newGame(undefined, 5));
    const { events } = runDay(s);
    const queued = new Set<number>();
    const done = new Set<number>();
    let last = -1;
    for (const e of events) {
      if (e.k !== 'pitcher' && e.k !== 'serve' && e.k !== 'quit' && e.k !== 'soldOut') {
        // arrivals/hours are emitted in order; service events may be emitted lazily but never before arrival
        expect(e.t).toBeGreaterThanOrEqual(last - 1);
        last = e.t;
      }
      if (e.k === 'arrive' && e.o === 'queue') queued.add(e.c);
      if (e.k === 'serve' || e.k === 'quit') done.add(e.c);
    }
    expect([...queued].every((c) => done.has(c))).toBe(true);
    const serve = events.filter((e): e is Extract<SimEvent, { k: 'serve' }> => e.k === 'serve');
    for (const e of serve) {
      const arr = events.find((x) => x.k === 'arrive' && x.c === e.c)!;
      expect(e.t).toBeGreaterThanOrEqual(arr.t);
    }
  });

  it('ice is gone at night and stock never goes negative', () => {
    const s = stockUp(newGame(undefined, 6));
    const r = runDay(s);
    expect(r.state.inventory.ice.qty).toBe(0);
    expect(r.state.inventory.sugar.qty).toBeGreaterThanOrEqual(0);
    expect(r.state.inventory.cups.qty).toBeGreaterThanOrEqual(0);
    expect(lemonCount(r.state.inventory)).toBeGreaterThanOrEqual(0);
  });

  it('lemons bought on day 1 are discarded at the end of day 6', () => {
    let s = buy(newGame(undefined, 7), 'lemons', 2); // 144 lemons, far more than needed
    for (let d = 1; d <= 6; d++) {
      const r = runDay(s, { stands: { 0: { locationId: null } } });
      if (d < 6) expect(r.report.spoiledLemons).toBe(0);
      else {
        expect(r.report.spoiledLemons).toBe(144);
        expect(r.report.costs.spoilage).toBeGreaterThan(0);
      }
      s = r.state;
    }
  });

  it('rain cuts traffic', () => {
    let rainy = 0;
    let sunny = 0;
    let nr = 0;
    let ns = 0;
    let s = newGame(undefined, 8);
    for (let d = 0; d < 60; d++) {
      const r = runDay(s);
      const p = r.report.stands[0]!.passersby;
      const weekend = (r.report.day - 1) % 7 >= 5;
      if (!weekend && r.report.weather.condition === 'rain') (rainy += p), nr++;
      if (!weekend && r.report.weather.condition === 'sunny') (sunny += p), ns++;
      s = r.state;
    }
    expect(nr).toBeGreaterThan(0);
    expect(rainy / nr).toBeLessThan((sunny / ns) * 0.75);
  });

  it('higher price → fewer buyers (same seed)', () => {
    const s = stockUp(newGame(undefined, 9));
    const cheap = runDay(s, { stands: { 0: { price: 0.5 } } }).report.stands[0]!;
    const dear = runDay(s, { stands: { 0: { price: 2.5 } } }).report.stands[0]!;
    expect(dear.buyers).toBeLessThan(cheap.buyers);
    expect(dear.tooExpensive).toBeGreaterThan(cheap.tooExpensive);
  });

  it('a stand with no location does nothing and the location decays', () => {
    const s = stockUp(newGame(undefined, 10));
    const r = runDay(s, { stands: { 0: { locationId: null } } });
    expect(r.report.stands).toHaveLength(0);
    expect(r.state.locations.maple.rep).toBe(39);
  });

  it('advances the calendar and refreshes the morning', () => {
    const s = newGame(undefined, 11);
    const r = runDay(s);
    expect(r.state.day).toBe(2);
    expect(r.state.ledger).toEqual({ stock: 0, ads: 0, capital: 0 });
    expect(r.state.stats.netWorthHistory).toHaveLength(1);
  });
});

describe('actions', () => {
  it('buying deducts cash and refuses when broke', () => {
    const s = newGame(undefined, 1);
    const r = dispatch(s, { type: 'buy', item: 'lemons', pack: 0 });
    expect(r.ok).toBe(true);
    expect(r.state.cash).toBeCloseTo(100 - 3.6);
    expect(s.cash).toBe(100);
    const broke = dispatch(s, { type: 'buy', item: 'lemons', pack: 2, count: 10 });
    expect(broke.ok).toBe(false);
    expect(broke.state).toBe(s);
  });

  it('validates recipe, price, and locations', () => {
    const s = newGame(undefined, 1);
    expect(dispatch(s, { type: 'setRecipe', standId: 0, recipe: { lemons: 0, sugar: 1, ice: 1 } }).ok).toBe(false);
    expect(dispatch(s, { type: 'setPrice', standId: 0, price: 1.5 }).ok).toBe(true);
    expect(dispatch(s, { type: 'assignStand', standId: 0, locationId: 'neon' }).ok).toBe(false);
    expect(() => runDay(s, { stands: { 0: { locationId: 'neon' } } })).toThrow();
  });

  it('licences, upgrades, hiring and campaigns', () => {
    let s = newGame(undefined, 1);
    s = { ...s, cash: 5000 };
    let r = dispatch(s, { type: 'buyLicense' });
    expect(r.ok && r.state.stands.length).toBe(2);
    expect(r.state.cash).toBe(3000);
    r = dispatch(r.state, { type: 'buyUpgrade', standId: 0, upgrade: 'body' });
    expect(r.state.stands[0]!.upgrades.body).toBe(1);
    r = dispatch(r.state, { type: 'buyGlobalUpgrade', upgrade: 'fridge' });
    expect(r.state.globalUpgrades.fridge).toBe(true);
    expect(dispatch(r.state, { type: 'buyGlobalUpgrade', upgrade: 'fridge' }).ok).toBe(false);
    const cand = r.state.candidates[0]!;
    r = dispatch(r.state, { type: 'hire', candidateId: cand.id, standId: 0 });
    expect(r.state.stands[0]!.staff).toHaveLength(1);
    expect(r.state.candidates).toHaveLength(2);
    r = dispatch(r.state, { type: 'fire', standId: 0, staffId: cand.id });
    expect(r.state.stands[0]!.staff).toHaveLength(0);
    r = dispatch(r.state, { type: 'startCampaign', campaign: 'flyers', locationId: 'maple' });
    expect(r.ok).toBe(true);
    expect(r.state.ledger.ads).toBe(25);
    expect(dispatch(r.state, { type: 'startCampaign', campaign: 'flyers' }).ok).toBe(false);
  });
});
