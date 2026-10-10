import { describe, expect, it } from 'vitest';
import { CONFIG as C } from '../src/config';
import { migrate, SAVE_VERSION, SaveSlots, memoryStore, serialize } from '../src/save/save';
import { attributeDay, dispatch, type GameState, newGame, projectPurchase, runDay, runDayWithAttribution, type SimEvent } from '../src/sim';
import { botMorning } from '../scripts/bots';
import { stockUp } from './helpers';

/** A morning at `loc` with plenty of stock, and cash to buy things. */
function morning(seed = 1, loc: GameState['stands'][number]['locationId'] = 'maple'): GameState {
  let s = newGame(C, seed);
  s.cash = 10_000;
  s.locations[loc!].unlocked = true;
  s.locations[loc!].rep = 60;
  s.stands[0]!.locationId = loc;
  for (let i = 0; i < 4; i++) s = stockUp(s);
  return s;
}

function buy(s: GameState, a: Parameters<typeof dispatch>[1]): GameState {
  const r = dispatch(s, a);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

const arrivals = (events: SimEvent[]) => events.filter((e) => e.k === 'arrive').map((e) => (e.k === 'arrive' ? [e.t, e.s, e.c, e.a] : null));

/** FNV-1a over JSON, the same fingerprint recorded on main before M10. */
function fingerprint(v: unknown): string {
  const s = JSON.stringify(v);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

describe('M10: unchanged outcomes', () => {
  it('runDay returns exactly what it did after M9 for the same seed and plan', () => {
    // Recorded on main at the M9 merge (5088724 + play log), Sensible bot, 40 days per seed.
    const expected = ['1796b124', '012139b7', '7d789e3c'];
    const got = [1, 7, 42].map((seed) => {
      let s = newGame(C, seed);
      const mem = { lastReport: null as ReturnType<typeof runDay>['report'] | null };
      const parts: unknown[] = [];
      for (let d = 0; d < 40; d++) {
        const m = botMorning(s, mem, { name: 'Sensible', expand: true }, C);
        const r = runDay(m.state, m.plan, C);
        parts.push(r.events, r.report);
        mem.lastReport = r.report;
        s = r.state;
      }
      return fingerprint(parts);
    });
    expect(got).toEqual(expected);
  });

  it('runDayWithAttribution plays the same day as runDay', () => {
    const s = buy(morning(3), { type: 'buyUpgrade', standId: 0, upgrade: 'neon' });
    const a = runDay(s);
    const b = runDayWithAttribution(s);
    expect(b.events).toEqual(a.events);
    expect(b.report).toEqual(a.report);
  });
});

describe('M10: attributeDay', () => {
  it('zero for nothing: the Umbrella on a cool, dry day adds exactly $0.00', () => {
    let s = morning(2);
    s.stands[0]!.upgrades.umbrella = true; // parked, but owned from before M9
    s.purchases.push({ item: 'umbrella', standId: 0, day: 1, cost: 120, earnedBack: 0 });
    s.weather = { condition: 'sunny', dayTemp: 70 };
    const line = attributeDay(s).find((l) => l.item === 'umbrella')!;
    expect(line.profit).toBe(0);
    expect(line.count).toBe(0);
  });

  it('same crowd: removing any upgrade or staff member leaves the arrivals identical', () => {
    const base = morning(4, 'financial');
    base.weather = { condition: 'sunny', dayTemp: 90 };
    const variants: [string, (s: GameState) => void][] = [
      ['body', (s) => void (s.stands[0]!.upgrades.body = 2)],
      ['juicer', (s) => void (s.stands[0]!.upgrades.juicer = 2)],
      ['register', (s) => void (s.stands[0]!.upgrades.register = 1)],
      ['neon', (s) => void (s.stands[0]!.upgrades.neon = true)],
      ['speaker', (s) => void (s.stands[0]!.upgrades.speaker = true)],
      ['cooler', (s) => void (s.stands[0]!.upgrades.cooler = true)],
      ['umbrella', (s) => void (s.stands[0]!.upgrades.umbrella = true)],
      ['fridge', (s) => void (s.globalUpgrades.fridge = true)],
      ['flyers', (s) => void s.campaigns.push({ id: 'flyers', startDay: s.day, locationId: 'financial' })],
      ...(['server', 'promoter', 'mixer'] as const).map((role): [string, (s: GameState) => void] => [
        role,
        (s) => void s.stands[0]!.staff.push({ id: role, name: 'Sam', role, skill: 2, daysWorked: 0 }),
      ]),
    ];
    const plain = arrivals(runDay(base).events);
    for (const [name, add] of variants) {
      const s = structuredClone(base);
      add(s);
      expect(arrivals(runDay(s).events), name).toEqual(plain);
    }
  });

  it('measures upgrades, staff and campaigns against the same day without them', () => {
    let s = morning(5, 'financial');
    s.weather = { condition: 'sunny', dayTemp: 92 };
    s = buy(s, { type: 'buyUpgrade', standId: 0, upgrade: 'register' });
    s = buy(s, { type: 'startCampaign', campaign: 'flyers', locationId: 'financial' });
    s.stands[0]!.staff.push({ id: 'x', name: 'Sam', role: 'server', skill: 2, daysWorked: 0 });
    const lines = attributeDay(s);
    const real = runDay(s).report;

    const reg = lines.find((l) => l.item === 'register')!;
    const noReg = structuredClone(s);
    noReg.stands[0]!.upgrades.register = 0;
    const r2 = runDay(noReg).report;
    expect(reg.profit).toBeCloseTo(real.profit - r2.profit, 2);
    expect(reg.count).toBe(r2.stands[0]!.lostQueue - real.stands[0]!.lostQueue);
    expect(reg.measure).toBe('leftLine');

    const server = lines.find((l) => l.kind === 'staff')!;
    expect(server).toMatchObject({ item: 'server', name: 'Sam', standId: 0, measure: 'leftLine' });

    const flyers = lines.find((l) => l.item === 'flyers')!;
    const noFlyers = structuredClone(s);
    noFlyers.campaigns = [];
    const r3 = runDay(noFlyers).report;
    const cost = C.marketing.campaigns.flyers.cost / C.marketing.campaigns.flyers.days;
    expect(flyers.profit).toBeCloseTo(real.profit - r3.profit - cost, 2);
    expect(flyers).toMatchObject({ approx: false, measure: 'stopped', standId: 0 });
  });

  it('Radio and TV are averaged and marked approximate; the Weather radio reports the forecast', () => {
    let s = morning(6);
    s = buy(s, { type: 'startCampaign', campaign: 'radio' });
    s = buy(s, { type: 'buyGlobalUpgrade', upgrade: 'radio' });
    s.forecastHistory = [true, true, false, true, true, true, true, true, true].map((right, i) => ({ day: i + 1, right }));
    const lines = attributeDay(s);
    expect(lines.find((l) => l.kind === 'campaign')).toMatchObject({ item: 'radio', approx: true, standId: null });
    const f = lines.find((l) => l.kind === 'forecast')!;
    expect(f.forecast!.of).toBe(10);
    const today = s.forecast.condition === s.weather.condition ? 1 : 0;
    expect(f.forecast!.right).toBe(8 + today);
  });

  it('paid-off and replaced upgrades leave the list', () => {
    let s = morning(7);
    s = buy(s, { type: 'buyUpgrade', standId: 0, upgrade: 'body' });
    s = buy(s, { type: 'buyUpgrade', standId: 0, upgrade: 'body' });
    s = buy(s, { type: 'buyUpgrade', standId: 0, upgrade: 'neon' });
    expect(s.purchases.map((p) => [p.item, p.tier, p.replaced ?? false])).toEqual([
      ['body', 1, true],
      ['body', 2, false],
      ['neon', undefined, false],
    ]);
    s.purchases[2]!.earnedBack = s.purchases[2]!.cost;
    const items = attributeDay(s).map((l) => `${l.item}`);
    expect(items).toEqual(['body']);
  });
});

describe('M10: ledger', () => {
  it('earnedBack rises by each day’s effect and the paid-off day is marked once', () => {
    let s = morning(8, 'campus');
    s = buy(s, { type: 'buyUpgrade', standId: 0, upgrade: 'body' });
    const cost = s.purchases[0]!.cost;
    let paidOff: number | undefined;
    for (let d = 0; d < 60 && paidOff === undefined; d++) {
      const before = s.purchases[0]!.earnedBack;
      const r = runDayWithAttribution(stockUp(stockUp(s)));
      const line = r.attribution.find((l) => l.item === 'body')!;
      const after = r.state.purchases[0]!.earnedBack;
      expect(after).toBeCloseTo(before + line.profit, 2);
      if (after >= cost) {
        expect(r.state.purchases[0]!.paidOffDay).toBe(r.report.day);
        paidOff = r.report.day;
      } else expect(r.state.purchases[0]!.paidOffDay).toBeUndefined();
      s = r.state;
      s.cash = 10_000;
    }
    expect(paidOff).toBeDefined();
    // Once paid off, it leaves the report and stops accruing.
    const r = runDayWithAttribution(stockUp(s));
    expect(r.attribution.find((l) => l.item === 'body')).toBeUndefined();
    expect(r.state.purchases[0]!.paidOffDay).toBe(paidOff);
  });

  it('keeps the forecast history and yesterday’s numbers', () => {
    let s = morning(9);
    for (let d = 0; d < 12; d++) s = runDayWithAttribution(stockUp(s)).state;
    expect(s.forecastHistory).toHaveLength(C.feedback.forecastHistoryDays);
    expect(s.forecastHistory.at(-1)!.day).toBe(s.day - 1);
    expect(s.yesterday).toMatchObject({ day: s.day - 1, stands: [{ standId: 0, locationId: 'maple' }] });
  });
});

describe('M10: projectPurchase', () => {
  const action = { type: 'buyUpgrade', standId: 0, upgrade: 'body' } as const;

  it('no peeking: the result is the same whatever tomorrow’s real weather turns out to be', () => {
    const s = morning(10);
    const a = projectPurchase(s, action);
    for (const weather of [
      { condition: 'storm', dayTemp: 55 },
      { condition: 'sunny', dayTemp: 98 },
    ] as const) {
      expect(projectPurchase({ ...structuredClone(s), weather }, action)).toEqual(a);
    }
  });

  it('is repeatable and leaves the state alone', () => {
    const s = morning(11);
    const copy = structuredClone(s);
    const a = projectPurchase(s, action);
    expect(projectPurchase(s, action)).toEqual(a);
    expect(s).toEqual(copy);
    expect(a.kind).toBe('gain');
    if (a.kind === 'gain') {
      expect(a.samples).toHaveLength(C.feedback.projectionSamples);
      expect(a.low).toBeLessThanOrEqual(a.median);
      expect(a.high).toBeGreaterThanOrEqual(a.median);
      expect(a.median).toBeGreaterThan(0);
    }
  });

  it('takes wages and campaign costs off, and says when it cannot measure', () => {
    const s = morning(12);
    s.candidates = [{ id: 'c1', name: 'Ava', role: 'server', skill: 2 }];
    const hire = projectPurchase(s, { type: 'hire', candidateId: 'c1', standId: 0 });
    expect(hire.kind === 'gain' && hire.median).toBeLessThan(0); // a Server is wasted at a quiet park
    const flyers = projectPurchase(s, { type: 'startCampaign', campaign: 'flyers', locationId: 'maple' });
    expect(flyers.kind === 'gain' && flyers.dailyCost).toBeCloseTo(6);
    expect(projectPurchase(s, { type: 'buyGlobalUpgrade', upgrade: 'radio' })).toEqual({ kind: 'unmeasurable' });
    const unplaced = structuredClone(s);
    unplaced.stands[0]!.locationId = null;
    expect(projectPurchase(unplaced, action).kind).toBe('blocked');
  });
});

describe('M10: save migration', () => {
  it('a save from before M10 loads with ledger entries for what it owns', () => {
    const s = morning(13) as Partial<GameState> & Record<string, unknown>;
    s.stands![0]!.upgrades.body = 2;
    s.stands![0]!.upgrades.neon = true;
    s.globalUpgrades!.radio = true;
    delete s.purchases;
    delete s.forecastHistory;
    delete s.yesterday;
    const out = migrate({ version: 1, state: s });
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.state.purchases).toEqual([
      { item: 'body', tier: 2, standId: 0, day: s.day, cost: C.upgrades.body.tiers[2]!.cost, earnedBack: 0 },
      { item: 'neon', standId: 0, day: s.day, cost: C.upgrades.neon.cost, earnedBack: 0 },
      { item: 'radio', standId: null, day: s.day, cost: C.upgrades.radio.cost, earnedBack: 0 },
    ]);
    expect(out.state.forecastHistory).toEqual([]);
    expect(out.state.yesterday).toBeNull();
    // And it plays on.
    const store = memoryStore();
    store.setItem('squeeze-city:slot:0', JSON.stringify({ version: 1, state: s }));
    const loaded = new SaveSlots(store).load(0)!;
    expect(() => runDayWithAttribution(loaded)).not.toThrow();
    expect(JSON.parse(serialize(loaded)).version).toBe(2);
  });
});
