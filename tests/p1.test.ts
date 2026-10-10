import { describe, expect, it } from 'vitest';
import { P1 } from '../src/config/p1';
import {
  buyBusiness,
  learnSkill,
  morningBoard,
  newP1Game,
  type P1State,
  runP1Day,
  setQtyMode,
  xpForLevel,
} from '../src/sim/p1/game';
import { actualWeather, drawCustomers, forecastFor, simulate } from '../src/sim/p1/model';

/** A game at the drink stand with plenty of cash. */
function atStand(seed = 1, day = 1): P1State {
  return { ...newP1Game(seed), day, owned: { market: true, stand: true }, cash: 5000, earned: 500 };
}

describe('P1 model', () => {
  it('is deterministic: the same seed and plan give the same day', () => {
    const s = atStand(4);
    const a = runP1Day(s, { kind: 'open', batch: 200, price: 1.2 });
    const b = runP1Day(s, { kind: 'open', batch: 200, price: 1.2 });
    expect(b).toEqual(a);
  });

  it('draws the same customers whatever the batch and price', () => {
    const s = atStand(5);
    const c1 = drawCustomers(s.seed, s.day, 'stand', P1);
    const r1 = runP1Day(s, { kind: 'open', batch: 50, price: 0.8 });
    const r2 = runP1Day(s, { kind: 'open', batch: 400, price: 2.0 });
    expect(drawCustomers(s.seed, s.day, 'stand', P1)).toEqual(c1);
    const arrivals = (ev: typeof r1.events) => ev.filter((e) => e.k === 'arrive').map((e) => (e.k === 'arrive' ? [e.t, e.c, e.a] : 0));
    expect(arrivals(r2.events)).toEqual(arrivals(r1.events));
  });

  it('reactions match the price and what each customer would have paid', () => {
    const customers = drawCustomers(7, 3, 'stand', P1);
    const price = 1.1;
    const res = simulate(customers, 10_000, price, 0.25, 0.5, P1);
    for (const o of res.outcomes) {
      const w = o.customer.wtp;
      if (w < price) expect(o.reaction).toBe('walk');
      else if (w >= price * P1.reactions.deal) expect(o.reaction).toBe('deal');
      else if (w >= price * P1.reactions.fair) expect(o.reaction).toBe('fair');
      else expect(o.reaction).toBe('pricey');
    }
    expect(res.reactions.soldOut).toBe(0);
  });

  it('sells out, puts the time up, and turns the rest away', () => {
    const customers = drawCustomers(7, 3, 'stand', P1);
    const res = simulate(customers, 20, 1.0, 0.25, 0.5, P1);
    expect(res.sold).toBe(20);
    expect(res.soldOutAt).not.toBeNull();
    expect(res.walkedSoldOut).toBeGreaterThan(0);
    expect(res.profit).toBeCloseTo(20 * 1.0 - 20 * 0.25, 2);
  });

  it('the forecast never depends on anything but the seed and day', () => {
    expect(forecastFor(9, 12, P1)).toEqual(forecastFor(9, 12, P1));
    let right = 0;
    for (let d = 1; d <= 2000; d++) if (forecastFor(3, d, P1).weather === actualWeather(3, d, P1)) right++;
    expect(right / 2000).toBeGreaterThan(0.72);
    expect(right / 2000).toBeLessThan(0.9);
  });
});

describe('P1 report: what you missed', () => {
  it('"would have earned" figures come from replaying the same day, exactly', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const s = atStand(seed, 3);
      const r = runP1Day(s, { kind: 'open', batch: 60, price: 0.55 });
      const customers = drawCustomers(s.seed, s.day, 'stand', P1);
      for (const m of r.report.missed) {
        if (m.kind === 'soldOut') {
          const alt = simulate(customers, 60 + m.extra, 0.55, P1.stand.unitCost, P1.stand.salvage, P1);
          expect(m.gain).toBeCloseTo(alt.profit - r.report.result!.profit, 2);
        }
        if (m.kind === 'price') {
          const alt = simulate(customers, 60, m.better, P1.stand.unitCost, P1.stand.salvage, P1);
          expect(m.gain).toBeCloseTo(alt.profit - r.report.result!.profit, 2);
          expect(m.better).toBeGreaterThan(0.55);
        }
      }
    }
  });

  it('at Playtest 2 prices it says so, and suggests a better price or batch', () => {
    const s = atStand(2, 4);
    const r = runP1Day(s, { kind: 'open', batch: 400, price: 0.55 });
    expect(r.report.missed.some((m) => m.kind === 'price')).toBe(true);
    expect(r.report.missed.length).toBeLessThanOrEqual(P1.missed.maxLines);
    expect(r.report.suggestion.kind).not.toBe('keep');
  });

  it('finds up to three moments, in time order', () => {
    const s = atStand(3, 6);
    const r = runP1Day(s, { kind: 'open', batch: 30, price: 0.6 });
    expect(r.report.moments.length).toBeGreaterThan(0);
    expect(r.report.moments.length).toBeLessThanOrEqual(3);
    const ts = r.report.moments.map((m) => m.t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
    expect(r.report.moments.some((m) => m.kind === 'soldOut')).toBe(true);
  });
});

describe('P1 progression', () => {
  it('gigs pay, and businesses unlock on money earned, never cash in hand', () => {
    let s = newP1Game(1);
    const board = morningBoard(s);
    expect(board.business).toBeNull();
    expect(board.gigs).toHaveLength(3);
    const pay = board.gigs[0]!.pay;
    const r = runP1Day(s, { kind: 'gig', gig: board.gigs[0]!.id });
    expect(r.state.cash).toBeCloseTo(P1.startCash + pay, 2);
    expect(r.state.earned).toBe(pay);
    s = { ...r.state, cash: 10_000 };
    expect(buyBusiness(s, 'market').ok).toBe(false); // earned too little, however much cash
    s = { ...s, earned: P1.market.gate };
    expect(buyBusiness(s, 'stand').ok).toBe(false); // the market table comes first
    const bought = buyBusiness(s, 'market');
    expect(bought.ok && bought.state.cash).toBe(10_000 - P1.market.cost);
  });

  it('skill points come from money earned, and nodes have their prerequisites', () => {
    let s = atStand(1);
    s = { ...s, xp: xpForLevel(0) - 1 };
    const r = runP1Day(s, { kind: 'open', batch: 200, price: 1.2 });
    expect(r.report.levelUps).toBeGreaterThanOrEqual(1);
    s = { ...r.state, points: 10 };
    expect(learnSkill(s, 'standingOrder').ok).toBe(false); // needs Prep sense
    expect(learnSkill({ ...s, handDays: 0 }, 'prepSense').ok).toBe(false); // needs days by hand
    const p = learnSkill({ ...s, handDays: P1.skills.prepSense.handDays }, 'prepSense');
    expect(p.ok).toBe(true);
    if (p.ok) expect(learnSkill(p.state, 'standingOrder').ok).toBe(true);
  });

  it('Thrifty keeps more of the leftovers; Sharp eye shows what deal customers would have paid', () => {
    const s = atStand(8, 2);
    const plain = runP1Day(s, { kind: 'open', batch: 600, price: 1.2 }).report.result!;
    const thrifty = runP1Day({ ...s, skills: ['thrifty'] }, { kind: 'open', batch: 600, price: 1.2 }).report.result!;
    expect(thrifty.salvage).toBeCloseTo((plain.salvage / P1.stand.salvage) * P1.skills.thrifty.salvage, 2);
    expect(plain.dealWtp === null || plain.dealWtp >= 1.2 * P1.reactions.deal).toBe(true);
  });

  it('a handed-off batch can be taken back and handed off again with the same outcome', () => {
    const base = { ...atStand(6, 5), skills: ['prepSense', 'standingOrder'] as P1State['skills'] };
    const handed = setQtyMode(base, 'handed');
    expect(handed.ok).toBe(true);
    if (!handed.ok) return;
    const a = runP1Day(handed.state, { kind: 'open', batch: 1, price: 1.3 });
    expect(a.report.result!.made).toBe(morningBoard({ ...handed.state, price: 1.3 }).handedBatch); // sized for today's price
    const back = setQtyMode(handed.state, 'yours');
    const again = back.ok ? setQtyMode(back.state, 'handed') : back;
    expect(again.ok).toBe(true);
    if (again.ok) expect(runP1Day(again.state, { kind: 'open', batch: 1, price: 1.3 })).toEqual(a);
    // Taken back, the player's own batch is used.
    if (back.ok) expect(runP1Day(back.state, { kind: 'open', batch: 77, price: 1.3 }).report.result!.made).toBe(77);
  });

  it('Prep sense suggests a batch, and handing off is refused without the skill', () => {
    const s = atStand(3);
    expect(morningBoard(s).suggestion).toBeNull();
    expect(setQtyMode(s, 'handed').ok).toBe(false);
    expect(morningBoard({ ...s, skills: ['prepSense'] }).suggestion).toBeGreaterThan(0);
  });

  it('has a weekly goal from Monday and a week summary on Sunday night', () => {
    let s = atStand(2);
    expect(s.week.goal.target).toBeGreaterThan(0);
    let summary = null;
    for (let d = 0; d < 7; d++) {
      const r = runP1Day(s, { kind: 'open', batch: 200, price: 1.2 });
      s = r.state;
      if (d < 6) expect(r.report.weekSummary).toBeNull();
      else summary = r.report.weekSummary;
    }
    expect(summary).not.toBeNull();
    expect(summary!.days).toBe(7);
    expect(s.day).toBe(8);
    expect(s.week.progress).toBe(0);
  });

  it('the food cart unlock is reported once', () => {
    const s = { ...atStand(1), earned: P1.cartGate - 1 };
    const r = runP1Day(s, { kind: 'open', batch: 200, price: 1.2 });
    expect(r.report.unlocked).toContain('cart');
    expect(r.state.cartReady).toBe(true);
    expect(runP1Day(r.state, { kind: 'open', batch: 200, price: 1.2 }).report.unlocked).not.toContain('cart');
  });
});
